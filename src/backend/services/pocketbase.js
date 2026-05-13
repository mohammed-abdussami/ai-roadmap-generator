import pocketbase from "pocketbase";
import { POCKETBASE_URL } from "../../shared/constants/config";

export default function pocketbaseInstance() {
    const pb = new pocketbase(POCKETBASE_URL)
    console.log("POCKETBASE_URL env:", process.env.POCKETBASE_URL, "NEXT_PUBLIC_POCKETBASE_URL:", process.env.NEXT_PUBLIC_POCKETBASE_URL);

    return pb
}