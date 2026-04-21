import axios from "axios";
import { CommonResponse } from "@/api/common.ts";
import { getErrorMessage } from "@/utils/base.ts";

export type Attachment = {
  name: string;
  size: number;
  updated_at: string;
  storage_mode: string;
  public_url: string;
  referenced: boolean;
  reference_count: number;
};

export async function listAttachments(): Promise<Attachment[]> {
  try {
    const response = await axios.get("/admin/attachment/list");
    return Array.isArray(response.data) ? (response.data as Attachment[]) : [];
  } catch (e) {
    console.warn(e);
    return [];
  }
}

export async function deleteAttachment(name: string): Promise<CommonResponse> {
  try {
    const response = await axios.post("/admin/attachment/delete", null, {
      params: { name },
    });
    return response.data as CommonResponse;
  } catch (e) {
    console.warn(e);
    return { status: false, error: getErrorMessage(e) };
  }
}
