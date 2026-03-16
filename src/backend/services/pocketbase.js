import pocketbase from "pocketbase";
import { POCKETBASE_URL } from "../../shared/constants/config";

export default function pocketbaseInstance() {
    const pb = new pocketbase(POCKETBASE_URL)
    console.log("PocketBase URL:", POCKETBASE_URL);
    return pb
}