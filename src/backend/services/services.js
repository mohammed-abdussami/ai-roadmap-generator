import { POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD } from "@/shared/constants/config";
import pocketbaseInstance from "./pocketbase";
import cacheData from "memory-cache";
import { POCKETBASE_COLLECTIONS } from "../constants";

class Services {
    pb
    isLoading = false

    async checkAuth() {
        console.log("🔐 [checkAuth] Starting authentication check");
        const cacheKey = "auth/cookie"
        const cachedToken = cacheData.get(cacheKey);
        if (cachedToken) {
            this.pb.authStore.save(cachedToken)
            console.log("✓ [checkAuth] Using cached token");
            return true;
        } else {
            this.isLoading = true;
            await new Promise((resolve, reject) => {
                console.log("🔐 [checkAuth] Authenticating with credentials...");
                return this.pb.admins.authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD).then(() => {
                    cacheData.put(cacheKey, this.pb.authStore.token, 1000 * 60 * 60 * 24 * 1);
                    console.log("✓ [checkAuth] New token obtained and cached");
                }).catch(e => {
                    console.error("✗ [checkAuth] Authentication failed:", e?.message || e);
                }).finally(() => {
                    this.isLoading = false
                    resolve();
                })
            })
        }
    }

    constructor() {
        this.pb = pocketbaseInstance()
        this.pb.autoCancellation(false)
    }

    async saveRoadmap(data) {
        return await this.pb.collection(POCKETBASE_COLLECTIONS.ROADMAPS).create(data);
    }

    async getRecents() {
        // ✅ FIX: Query roadmaps directly (not the view) so unverified roadmaps
        // show up too — the roadmaps_recents view filters WHERE verified=1
        // which hides all newly generated roadmaps until manually verified.
        return await this.pb.collection(POCKETBASE_COLLECTIONS.ROADMAPS).getList(1, 20, {
            sort: "-created",
            fields: "id,title,code,category,verified,created"
        });
    }

    async getRoadmapByCode({ code, client_ip }) {
        const data = await this.pb.collection(POCKETBASE_COLLECTIONS.ROADMAPS).getFirstListItem(`code = "${code}"`);

        // ✅ FIX: roadmaps_likes view uses INNER JOIN so new roadmaps with
        // 0 likes have no row in the view → getOne() throws "no rows".
        // We now safely default to 0 without logging a false error.
        let likes = 0;
        try {
            const likesRow = await this.pb.collection(POCKETBASE_COLLECTIONS.ROADMAPS_LIKES).getOne(data.id);
            likes = likesRow?.likes ?? 0;
        } catch (e) {
            // No row = 0 likes (expected for new roadmaps — not a real error)
            likes = 0;
        }
        data.likes = likes;

        try {
            data.is_liked = (await this.getRoadmapClientLike({ roadmap_id: data.id, client_ip })) != null;
        } catch (e) {
            data.is_liked = false;
        }
        return data;
    }

    async getCategories() {
        console.log("📦 [getCategories] Fetching categories from PocketBase...");
        try {
            const result = await this.pb.collection(POCKETBASE_COLLECTIONS.CATEGORIES_EXTRA).getList(1, 99, {
                sort: "category_index"
            });
            console.log("✓ [getCategories] Successfully fetched", result.items.length, "categories");
            return result;
        } catch(e) {
            console.error("✗ [getCategories] Failed to fetch categories:", e?.message || e);
            throw e;
        }
    }

    async getRoadmapsByCategorySlug({ page = 1, perPage = 24, slug } = {}) {
        const category = await this.pb.collection(POCKETBASE_COLLECTIONS.CATEGORIES_EXTRA).getFirstListItem(`slug="${slug}"`);
        const items = await this.pb.collection(POCKETBASE_COLLECTIONS.ROADMAPS_EXTRA).getList(page, perPage, {
            filter: `category="${category.id}"`,
            sort: "-created"
        });
        return { items, category };
    }

    async getRoadmapClientLike({ roadmap_id, client_ip } = {}) {
        return await this.pb.collection(POCKETBASE_COLLECTIONS.LIKES).getFirstListItem(`roadmap="${roadmap_id}" && client_ip="${client_ip}"`);
    }

    async likeRoadmap({ roadmap_id, type = "add", client_ip } = {}) {
        let oldLike = null;
        try {
            oldLike = await this.getRoadmapClientLike({ roadmap_id, client_ip });
        } catch (e) { }
        if (type == "add") {
            if (!oldLike) {
                return await this.pb.collection(POCKETBASE_COLLECTIONS.LIKES).create({
                    roadmap: roadmap_id,
                    client_ip
                });
            }
            return false;
        } else {
            if (oldLike) {
                return await this.pb.collection(POCKETBASE_COLLECTIONS.LIKES).delete(oldLike.id);
            }
            return false;
        }
    }

    async getRoadmapsChart({ page = 1, perPage = 30 } = {}) {
        return await this.pb.collection(POCKETBASE_COLLECTIONS.ROADMAPS_CHART).getList(page, perPage);
    }
}

export const backendServices = new Proxy(new Services(), {
    get(target, propKey, receiver) {
        const origMethod = target[propKey];
        if (propKey === "checkAuth") {
            return origMethod;
        } else {
            return async function (...args) {
                await target.checkAuth();
                const result = await origMethod.apply(target, args);
                return result;
            };
        }
    },
});