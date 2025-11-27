import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/generate-image", async (req, res) => 
{ 
    try 
    {
        const { word } = req.body;
        const prompt = `Create an ultra-detailed, high-impact image interpreting the phrase 
        "Rainfall ${word}" as literally and absurdly as possible. Show ${word} in a dramatic, hyperreal, cinematic scene. 
        Use vibrant colors, exaggerated forms, dream-like atmosphere, impossible physics, 
        and photorealistic textures. The concept should be bold, absurd, whimsical, unexpected and visually striking`;
        
        const response = await fetch("https://api.deepai.org/api/text2img", 
        {
            method: "POST",
            headers: 
            {
                "api-key": process.env.DEEPAI_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: prompt })
        });
        const data = await response.json();

        if (!data.output_url) 
        {
          console.error("DeepAI error:", data);
          return res.status(500).json({ error: "DeepAI failed" });
        }
        res.json({
          type: "image",
          url: data.output_url
        });
    } 
    catch (error) 
    {
      console.error("Server error:", error);
      res.status(500).json({ error: "Server error" });
    }
});

app.listen(5001, () => 
{
    console.log("DeepAI image server running on http://localhost:5001");
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

