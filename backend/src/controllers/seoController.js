const { prisma } = require("../lib/prisma");

exports.getSeo = async (req, res, next) => {
  try {
    const page = (req.params.page || "home").toLowerCase();
    const key = `seo_${page}`;
    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    const defaultSeo = {
      metaTitle: page === "home" ? "Trrabb - Adventure & Group Trips" : "",
      metaDescription: "",
      ogImage: "",
    };

    const data = setting && setting.value ? { ...defaultSeo, ...setting.value } : defaultSeo;
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching SEO setting:", error);
    res.json({
      success: true,
      data: { metaTitle: "", metaDescription: "", ogImage: "" },
    });
  }
};

exports.updateSeo = async (req, res, next) => {
  try {
    const page = (req.params.page || "home").toLowerCase();
    const key = `seo_${page}`;
    const { metaTitle, metaDescription, ogImage } = req.body;

    const value = {
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
      ogImage: ogImage || "",
    };

    await prisma.setting.upsert({
      where: { key },
      create: {
        key,
        value,
        tenantId: req.user?.tenantId || "default",
      },
      update: {
        value,
      },
    });

    res.json({ success: true, message: "SEO updated successfully", data: value });
  } catch (error) {
    console.error("Error updating SEO setting:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSitemap = async (req, res) => res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://youthcamping.online/</loc></url>
</urlset>`);

exports.getRobots = async (req, res) => res.type("text/plain").send(`User-agent: *
Allow: /
Sitemap: https://youthcamping.online/sitemap.xml`);
