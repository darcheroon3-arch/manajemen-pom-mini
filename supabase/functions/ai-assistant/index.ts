import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

async function getFinancialData() {
  const [stockRes, salesRes, expensesRes, settingsRes] = await Promise.all([
    supabase.from("stock_entries").select("*"),
    supabase.from("sales").select("*"),
    supabase.from("expenses").select("*"),
    supabase.from("settings").select("*").single(),
  ]);

  const stock = stockRes.data || [];
  const sales = salesRes.data || [];
  const expenses = expensesRes.data || [];
  const settings = settingsRes.data || { harga_jual_per_liter: 10000, profit_per_liter: 2000, biaya_isi_per_64_liter: 10000 };

  const totalStok = stock.reduce((s: number, e: any) => s + Number(e.jumlah_liter), 0);
  const totalTerjual = sales.reduce((s: number, e: any) => s + Number(e.liter_terjual), 0);
  const sisaBensin = totalStok - totalTerjual;
  const totalOmzet = sales.reduce((s: number, e: any) => s + Number(e.omzet), 0);
  const totalProfit = sales.reduce((s: number, e: any) => s + Number(e.profit), 0);
  const totalPengeluaran = expenses.reduce((s: number, e: any) => s + Number(e.nominal), 0);
  const totalBalance = totalProfit - totalPengeluaran;
  const totalPenjualan = sales.length;
  const avgProfitPerLiter = sales.length > 0 ? totalProfit / totalTerjual : 0;
  const profitMargin = totalOmzet > 0 ? (totalProfit / totalOmzet) * 100 : 0;

  const today = new Date().toISOString().split("T")[0];
  const todaySales = sales.filter((s: any) => s.tanggal === today);
  const todayOmzet = todaySales.reduce((s: number, e: any) => s + Number(e.omzet), 0);
  const todayProfit = todaySales.reduce((s: number, e: any) => s + Number(e.profit), 0);
  const todayLiter = todaySales.reduce((s: number, e: any) => s + Number(e.liter_terjual), 0);

  const salesByDate = sales.reduce((acc: any, s: any) => {
    const d = s.tanggal;
    if (!acc[d]) acc[d] = { omzet: 0, profit: 0, liter: 0 };
    acc[d].omzet += Number(s.omzet);
    acc[d].profit += Number(s.profit);
    acc[d].liter += Number(s.liter_terjual);
    return acc;
  }, {});
  const dates = Object.keys(salesByDate).sort();
  const latestDates = dates.slice(-7);
  const recentTrend = latestDates.map(d => ({ date: d, omzet: salesByDate[d].omzet, profit: salesByDate[d].profit, liter: salesByDate[d].liter }));

  const topDays = [...dates].sort((a, b) => salesByDate[b].profit - salesByDate[a].profit).slice(0, 3);
  const bestDay = topDays[0] || null;

  const expenseCategories = expenses.reduce((acc: any, e: any) => {
    const cat = e.kategori || "Lainnya";
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += Number(e.nominal);
    return acc;
  }, {});
  const topExpenseCategory = Object.entries(expenseCategories).sort((a: any, b: any) => b[1] - a[1])[0];

  return {
    sisaBensin, totalOmzet, totalProfit, totalPengeluaran, totalBalance,
    totalPenjualan, totalTerjual, avgProfitPerLiter, profitMargin,
    todayOmzet, todayProfit, todayLiter, todaySalesCount: todaySales.length,
    recentTrend, bestDay, bestDayProfit: bestDay ? salesByDate[bestDay].profit : 0,
    topExpenseCategory: topExpenseCategory ? { name: topExpenseCategory[0], amount: topExpenseCategory[1] } : null,
    settings,
  };
}

function generateInsights(data: any) {
  const insights: string[] = [];
  
  if (data.sisaBensin < 50) {
    insights.push("⚠️ Stok bensin menipis. Segera isi stok untuk menghindari kehabisan.");
  } else if (data.sisaBensin > 500) {
    insights.push("✅ Stok bensin melimpah. Pertimbangkan promosi untuk meningkatkan penjualan.");
  }
  
  if (data.profitMargin < 15) {
    insights.push("💡 Profit margin rendah. Pertimbangkan naikkan harga jual atau kurangi biaya operasional.");
  } else if (data.profitMargin > 30) {
    insights.push("🎉 Profit margin sangat bagus! Model bisnis ini sangat menguntungkan.");
  }
  
  if (data.totalPengeluaran > data.totalProfit * 0.7) {
    insights.push("📊 Pengeluaran mendekati 70% dari profit. Perlu evaluasi efisiensi biaya.");
  }
  
  if (data.todaySalesCount === 0) {
    insights.push("📅 Belum ada penjualan hari ini. Cek apakah pom mini sudah buka.");
  } else if (data.todayLiter > 100) {
    insights.push("🔥 Penjualan hari ini sangat baik! " + data.todayLiter.toFixed(1) + " liter terjual.");
  }
  
  if (data.bestDay) {
    insights.push("📈 Hari terbaik: " + data.bestDay + " dengan profit Rp" + data.bestDayProfit.toLocaleString("id-ID") + ".");
  }
  
  if (data.topExpenseCategory) {
    insights.push("💸 Pengeluaran terbesar: " + data.topExpenseCategory.name + " (Rp" + data.topExpenseCategory.amount.toLocaleString("id-ID") + ").");
  }
  
  return insights;
}

function generateResponse(prompt: string, data: any) {
  const promptLower = prompt.toLowerCase();
  const insights = generateInsights(data);
  
  if (promptLower.includes("saran") || promptLower.includes("strategi") || promptLower.includes("kembang") || promptLower.includes("tips")) {
    const saran = [
      "🎯 **Saran Pengembangan Profit:**",
      "",
      ...insights,
      "",
      "💡 **Rekomendasi Umum:**",
      "1. **Monitor stok harian** — hindari kehabisan bensin saat permintaan tinggi.",
      "2. **Analisis harga kompetitor** — pastikan harga jual kompetitif.",
      "3. **Program loyalitas** — beri diskon kecil untuk pembeli rutin.",
      "4. **Promosi jam sibuk** — tambah bonus liter di jam tertentu.",
      "5. **Kurangi waste** — pastikan pengukuran akurat, tidak ada kebocoran.",
      "6. **Diversifikasi** — jual minyak goreng, bensin jerry can, atau aksesoris motor.",
      "",
      "Profit saat ini: Rp" + data.totalProfit.toLocaleString("id-ID") + " (margin: " + data.profitMargin.toFixed(1) + "%)"
    ];
    return saran.join("\n");
  }
  
  if (promptLower.includes("data") || promptLower.includes("laporan") || promptLower.includes("keuangan") || promptLower.includes("ringkasan")) {
    return [
      "📊 **Ringkasan Keuangan:**",
      "",
      "• Total Omzet: Rp" + data.totalOmzet.toLocaleString("id-ID"),
      "• Total Profit: Rp" + data.totalProfit.toLocaleString("id-ID"),
      "• Total Pengeluaran: Rp" + data.totalPengeluaran.toLocaleString("id-ID"),
      "• Balance (Net): Rp" + data.totalBalance.toLocaleString("id-ID"),
      "• Total Penjualan: " + data.totalPenjualan + " transaksi",
      "• Total Liter Terjual: " + data.totalTerjual.toLocaleString("id-ID", { minimumFractionDigits: 1 }) + " L",
      "• Sisa Bensin: " + data.sisaBensin.toLocaleString("id-ID", { minimumFractionDigits: 1 }) + " L",
      "• Profit Margin: " + data.profitMargin.toFixed(1) + "%",
      "• Rata-rata Profit/Liter: Rp" + data.avgProfitPerLiter.toLocaleString("id-ID", { maximumFractionDigits: 0 }),
      "",
      "📅 **Hari Ini:**",
      "• Omzet: Rp" + data.todayOmzet.toLocaleString("id-ID"),
      "• Profit: Rp" + data.todayProfit.toLocaleString("id-ID"),
      "• Liter Terjual: " + data.todayLiter.toLocaleString("id-ID", { minimumFractionDigits: 1 }) + " L",
      "• Transaksi: " + data.todaySalesCount,
      "",
      ...insights
    ].join("\n");
  }
  
  if (promptLower.includes("tren") || promptLower.includes("trend") || promptLower.includes("perkembangan") || promptLower.includes("grafik")) {
    if (data.recentTrend.length === 0) {
      return "Belum ada data tren. Mulai input penjualan untuk melihat perkembangan.";
    }
    const lines = data.recentTrend.map((t: any) => 
      "• " + t.date + ": " + t.liter.toLocaleString("id-ID", { minimumFractionDigits: 1 }) + " L | Rp" + t.omzet.toLocaleString("id-ID") + " | Profit Rp" + t.profit.toLocaleString("id-ID")
    );
    return [
      "📈 **Tren 7 Hari Terakhir:**",
      "",
      ...lines,
      "",
      "Analisis:",
      data.recentTrend[data.recentTrend.length - 1].profit > data.recentTrend[0].profit 
        ? "📊 Tren profit menaik. Pertahankan strategi!" 
        : "📉 Tren profit menurun. Evaluasi biaya dan harga."
    ].join("\n");
  }
  
  if (promptLower.includes("stok") || promptLower.includes("bensin") || promptLower.includes("isi")) {
    return [
      "⛽ **Status Stok:**",
      "",
      "• Sisa Bensin: " + data.sisaBensin.toLocaleString("id-ID", { minimumFractionDigits: 1 }) + " L",
      "• Total Stok Masuk: " + data.sisaBensin.toLocaleString("id-ID", { minimumFractionDigits: 1 }) + " L",
      "• Total Terjual: " + data.totalTerjual.toLocaleString("id-ID", { minimumFractionDigits: 1 }) + " L",
      "",
      data.sisaBensin < 50 
        ? "⚠️ **Peringatan:** Stok hampir habis. Segera isi stok!"
        : data.sisaBensin < 100
          ? "⚡ Stok menipis. Pertimbangkan isi stok dalam 1-2 hari."
          : "✅ Stok aman. Sisa " + data.sisaBensin.toLocaleString("id-ID", { minimumFractionDigits: 1 }) + " liter.",
      "",
      "💡 **Rekomendasi:** Jaga stok minimal 50 liter untuk menghindari kehabisan mendadak."
    ].join("\n");
  }
  
  if (promptLower.includes("pengeluaran") || promptLower.includes("biaya") || promptLower.includes("cost")) {
    return [
      "💸 **Analisis Pengeluaran:**",
      "",
      "• Total Pengeluaran: Rp" + data.totalPengeluaran.toLocaleString("id-ID"),
      data.topExpenseCategory ? "• Kategori Terbesar: " + data.topExpenseCategory.name + " (Rp" + data.topExpenseCategory.amount.toLocaleString("id-ID") + ")" : "",
      "",
      "📊 **Rasio Pengeluaran:**",
      "• Pengeluaran / Profit: " + (data.totalProfit > 0 ? (data.totalPengeluaran / data.totalProfit * 100).toFixed(1) : "0") + "%",
      "• Pengeluaran / Omzet: " + (data.totalOmzet > 0 ? (data.totalPengeluaran / data.totalOmzet * 100).toFixed(1) : "0") + "%",
      "",
      "💡 **Tips Hemat:**",
      "1. Review pengeluaran rutin setiap awal bulan.",
      "2. Bandingkan harga dari supplier berbeda.",
      "3. Kurangi biaya yang tidak produktif.",
      "4. Catat setiap pengeluaran, bahkan yang kecil."
    ].filter(Boolean).join("\n");
  }
  
  return [
    "👋 **Halo!** Saya AI Asisten Keuangan untuk Pom Mini Anda.",
    "",
    "📊 **Ringkasan Cepat:**",
    "• Profit total: Rp" + data.totalProfit.toLocaleString("id-ID"),
    "• Balance: Rp" + data.totalBalance.toLocaleString("id-ID"),
    "• Stok bensin: " + data.sisaBensin.toLocaleString("id-ID", { minimumFractionDigits: 1 }) + " L",
    "",
    ...insights,
    "",
    "💬 **Tanya saya tentang:**",
    "• \"Data keuangan\" — untuk laporan lengkap",
    "• \"Saran pengembangan\" — untuk strategi profit",
    "• \"Tren penjualan\" — untuk analisis 7 hari terakhir",
    "• \"Status stok\" — untuk informasi bensin",
    "• \"Analisis pengeluaran\" — untuk breakdown biaya"
  ].join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const prompt = body.prompt || "halo";
    const history = body.history || [];

    const data = await getFinancialData();
    const response = generateResponse(prompt, data);
    const time = getCurrentTime();

    return new Response(
      JSON.stringify({
        response,
        time,
        data: {
          totalProfit: data.totalProfit,
          totalBalance: data.totalBalance,
          sisaBensin: data.sisaBensin,
          profitMargin: data.profitMargin,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
