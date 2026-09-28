export default async function handler(req, res) {
  try {
    const mod = await import("./index.js");
    return res.status(200).json({
      status: "success",
      hasDefault: !!mod.default,
      type: typeof mod.default,
    });
  } catch (err) {
    return res.status(500).json({
      status: "import_error",
      message: err.message,
      stack: err.stack,
      code: err.code,
    });
  }
}
