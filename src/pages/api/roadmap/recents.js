import { backendServices } from "@/backend/services/services";
import cacheData from "memory-cache";

export const RECENTS_CACHE_KEY = "roadmap/recents";

export default async function handler(req, res) {
    try {
        const recents = cacheData.get(RECENTS_CACHE_KEY);
        if (recents) {
            return res.status(200).json({
                ok: true,
                data: recents
            });
        }
        let list = await backendServices.getRecents();
        // strip large data field before caching
        list.items = list.items.map(item => ({ ...item, data: null }));
        // 10 min cache
        cacheData.put(RECENTS_CACHE_KEY, list, 1000 * 60 * 10);
        return res.status(200).json({
            ok: true,
            data: list
        });
    } catch (e) {
        return res.status(500).json({
            ok: false,
            message: e?.message || e
        });
    }
}