/* global process */

const DEFAULT_RGPP_INTAKE_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzdMqWHpK8zCnkFF3NN1Jf3-unewJP98sMk33NPfyhi19jHHwRlRDqy2ABgAYbmNp_ZPg/exec";

const getIntakeEndpoint = () =>
  process.env.RGPP_INTAKE_ENDPOINT ||
  process.env.VITE_RGPP_INTAKE_ENDPOINT ||
  DEFAULT_RGPP_INTAKE_ENDPOINT;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ ok: false, message: "Method not allowed." });
    return;
  }

  const endpoint = getIntakeEndpoint();

  if (!endpoint) {
    response
      .status(500)
      .json({ ok: false, message: "RGPP intake endpoint is not configured." });
    return;
  }

  try {
    const payload =
      typeof request.body === "string" ? JSON.parse(request.body) : request.body;

    const upstreamResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const rawText = await upstreamResponse.text();
    let parsedResponse;

    try {
      parsedResponse = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsedResponse = null;
    }

    if (!upstreamResponse.ok) {
      response.status(502).json({
        ok: false,
        message:
          parsedResponse?.message ||
          "The RGPP intake service returned an unexpected response.",
      });
      return;
    }

    response.status(200).json(
      parsedResponse || {
        ok: true,
        message: "Submission received",
      }
    );
  } catch (error) {
    response.status(500).json({
      ok: false,
      message:
        error instanceof Error && error.message
          ? error.message
          : "Unable to submit RGPP request.",
    });
  }
}
