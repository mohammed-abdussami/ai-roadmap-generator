// src/pages/api/roadmap/generate.js
import OpenAI from "openai";
import { backendServices } from "@/backend/services/services";
import openAiInstance from "@/shared/helper/openai";
import cacheData from "memory-cache";
import { RECENTS_CACHE_KEY } from "./recents";

export default async function handler(req, res) {
  try {
    const title = req.query.title;
    const token = req.query.token;
    const maxItems = 30;
    const minItems = 15;
    const minLevels = 5;
    const debug = true;

    if (!title) {
      return res.status(400).json({ ok: false, message: "bad request params" });
    }

    let cats;
    try {
      cats = await backendServices.getCategories();
    } catch (err) {
      console.error("❌ Error fetching categories:", err?.message || err);
      return res.status(500).json({ ok: false, message: "Failed to fetch categories: " + (err?.message || err) });
    }

    const categoriesList = (cats.items || []).map(item => item.title).join(" | ");

    const findCatId = (titleStr) => {
      const found = (cats.items || []).find(item => item.title.toLowerCase() === titleStr.trim().toLowerCase());
      if (!found) {
        console.warn(`⚠️  Category "${titleStr}" not found, defaulting to "Other"`);
        const other = (cats.items || []).find(item => item.title.toLowerCase() === "other");
        return other ? other.id : (cats.items && cats.items[0] ? cats.items[0].id : null);
      }
      return found.id;
    };

    const basePrompt = `based on my prompt , make up to date roadmap
important response rules :
- collapse response in one line , remove space and new lines 

common rules:
- when you finished send @finish in end of prompt result , not json response
- all should has a parent
- root parent is 0
- root item level should be 0
- no null title
- short and efficient titles
- don't extra description

- response json should be single layer not nested items in items

- choose most related / similar category from here ( based on prompt ):
${categoriesList}
- choose Other Category if you not found right category

- sample response:
{ "category":"...","roadmap:[{"id": 1,"level":1,"parent":5or0,"title":"..."}] }

important items and levels rules:
- minimum ${minLevels} levels
- level 1 should has minimum 3 items
- minimum ${minItems} items
- maximum ${maxItems} items
- items should be less than ${maxItems}
- fill only requested fields
- no duplicate subjects

prompt: 
${title}`;

    const client = token ? openAiInstance(token) : openAiInstance();

    const messages = [];
    messages.push({ role: "user", content: basePrompt });

    let isFinished = false;
    let i = 0;
    const maxSteps = 3;
    const startTime = Date.now();

    while (!isFinished) {
      try {
        if (debug) console.log(`[Step ${i}] Calling NVIDIA model...`);
        const openai_res = await client.chat.completions.create({
          model: "meta/llama-3.3-70b-instruct",
          messages,
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: 1024,
        });

        if (openai_res?.choices?.length) {
          const text = openai_res.choices[0].message.content.trim();
          if (debug) console.log(`[Step ${i}] Received text preview: ${text.substring(0, 120)}...`);

          if (text.match(/@finish/)) {
            if (text !== "@finish") {
              isFinished = true;
            }
          }

          const newRes = text.replace(/\@finish/g, '').replace(/\n/g, '');
          messages.push({ role: "assistant", content: newRes });

          if (debug) console.log(`[Step ${i}] Assistant content appended`);
        } else {
          if (debug) console.warn(`[Step ${i}] No choices returned from model`);
        }
      } catch (e) {
        isFinished = true;
        console.error(`❌ [Step ${i}] NVIDIA/OpenAI client error:`, e?.message || e);
        return res.status(500).json({
          ok: false,
          message: `AI Error at step ${i}: ` + (e?.message || "unknown"),
          error: e?.response?.data || null
        });
      }

      if (i >= maxSteps) {
        if (debug) console.log("max steps reached");
        isFinished = true;
      }
      i++;
    }

    messages.shift();
    let ai_res = "";
    for (const message of messages) {
      ai_res += message.content;
    }

    ai_res = ai_res.replace(/\n$/g, '').trim();
    if (ai_res.at(-1) !== "}") ai_res += "}";

    try {
      const obj = JSON.parse(ai_res);
      if (debug) console.log("✓ JSON parsed successfully");

      const categoryTitle = obj.category || "";
      const catId = findCatId(categoryTitle);
      let roadmap = obj.roadmap || [];

      const rootIndex = roadmap.findIndex(item => item.id === 0);
      if (rootIndex === -1) {
        roadmap.push({ id: 0, level: 0, title });
      } else {
        if (roadmap[rootIndex]?.title?.trim() === "Root") {
          roadmap[rootIndex].title = title;
        }
      }

      roadmap = roadmap.filter(item => item?.title && item?.title !== "");

      const code = (Math.random() + 1).toString(36).substring(5);
      const endTime = Date.now();
      const saveRes = await backendServices.saveRoadmap({
        category: catId,
        code,
        title,
        data: JSON.stringify(roadmap),
        prompt: basePrompt,
        generate_time: Math.floor((endTime - startTime) / 1000)
      });

      if (debug) console.log("✓ Roadmap saved:", saveRes?.id || saveRes);

      // ✅ FIX: Bust the recents cache so new roadmap appears immediately
      cacheData.del(RECENTS_CACHE_KEY);
      if (debug) console.log("✓ Recents cache cleared");

      return res.status(200).json({ ok: true, data: { roadmap, code } });
    } catch (e) {
      console.error("❌ Processing error:", e?.message || e);
      if (debug) {
        console.log("AI Response was:", ai_res);
        console.log(e);
      }
      return res.status(500).json({ ok: false, message: e?.message || "invalid AI response" });
    }
  } catch (err) {
    console.error("❌ Global handler error:", err?.message || err);
    return res.status(500).json({ ok: false, message: "Server error: " + (err?.message || err) });
  }
}