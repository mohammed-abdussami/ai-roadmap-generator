// src/shared/helper/openai.js
import OpenAI from "openai";
import { OPEN_AI_TOKEN, OPEN_AI_BASEPATH } from "../constants/config";

export default function openAiInstance(apiKey = OPEN_AI_TOKEN) {
  return new OpenAI({
    baseURL: OPEN_AI_BASEPATH || "https://integrate.api.nvidia.com/v1",
    apiKey,
  });
}
