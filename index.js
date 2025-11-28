import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
  origin: "https://rainfall-word.vercel.app",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "api-key"]
}));

app.options("/generate-image", cors());
app.options("/api/rainfall", cors());

app.use(express.json());

app.post("/generate-image", async (req, res) => {
  try {
    const { word } = req.body;

    const prompt = `Create an ultra-detailed, high-impact image interpreting the phrase 
    "Rainfall ${word}" as literally and absurdly as possible.`

    const form = new FormData();
    form.append("text", prompt);

    const response = await fetch("https://api.deepai.org/api/text2img", {
      method: "POST",
      headers: {
        "api-key": process.env.DEEPAI_KEY
      },
      body: form
    });

    const data = await response.json();
    console.log("DeepAI reply:", data);

    if (!data.output_url) {
      return res.status(500).json({ error: "DeepAI rejected request", detail: data });
    }

    res.json({ type: "image", url: data.output_url });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT;

app.listen(PORT, () => 
{
  console.log("running on port:", PORT);
});


app.get("/api/rainfall", async (req, res) => 
{
    try 
    {
        const { lat, lon, mode } = req.query;
        const key = process.env.VISUAL_KEY;
        const base = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}`;

        let url = "";

        if (mode === "yesterday") 
        {
            url = `${base}/yesterday?unitGroup=metric&include=days&key=${key}`;
        }

        if (mode === "lastMonth") 
        {
            const end = new Date();  
            const start = new Date();
            start.setDate(start.getDate() - 30);

            const startStr = start.toISOString().split("T")[0];
            const endStr = end.toISOString().split("T")[0];

            const base ="https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline";

            url = `${base}/${lat},${lon}/${startStr}/${endStr}` +`?unitGroup=metric&include=days&contentType=json&key=${key}`;
        }

        if (mode === "thisWeek") 
        {
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon
            const monday = new Date(today);
            monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

            const startStr = monday.toISOString().split("T")[0];
            const endStr = today.toISOString().split("T")[0];

            const base = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline";

            url = `${base}/${lat},${lon}/${startStr}/${endStr}` + `?unitGroup=metric&include=days&contentType=json&key=${key}`;
        }

        const response = await fetch(url);
        const json = await response.json();

        if (!json.days) 
        {
            return res.json({ rainfall: null, error: "No rainfall data" });
        }
        const rainfall = json.days.reduce((sum, d) => sum + (d.precip || 0), 0);
        res.json
        ({
            mode,
            rainfall: Math.round(rainfall * 10) / 10,
            days: json.days.length,
            location: `${lat}, ${lon}`
        });
    }
    catch (err) 
    {
            console.error("Rainfall error:", err);
            res.status(500).json({ error: "Rainfall API failed" });
    }
    
});

