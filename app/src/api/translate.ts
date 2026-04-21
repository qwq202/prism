import axios from "axios";
import { getErrorMessage } from "@/utils/base.ts";

export type TranslateForm = {
  text: string;
  source: string;
  target: string;
};

export type TranslateResponse = {
  status: boolean;
  error?: string;
  data?: {
    text: string;
  };
};

export async function translateText(
  data: TranslateForm,
): Promise<TranslateResponse> {
  try {
    const response = await axios.post("/translate", data);
    return response.data as TranslateResponse;
  } catch (e) {
    return {
      status: false,
      error: getErrorMessage(e),
      data: {
        text: "",
      },
    };
  }
}
