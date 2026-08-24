import { httpClient } from "@/lib/http-client";
import { HttpMethod } from "@/types/api-types";

/**
 * Tải một file từ API rồi kích hoạt download phía trình duyệt.
 *
 * Luôn đi qua `httpClient`, KHÔNG dùng `fetch` trần: httpClient gắn Bearer token
 * lấy từ cookie `access_token`, tự refresh khi 401, và ném HttpError mang message
 * thật từ backend. Bản tự chế `fetch` trước đây đọc token từ localStorage — nơi
 * repo không bao giờ ghi token — nên nút tải file mẫu luôn nhận 401.
 */
export async function downloadFileFromApi(endpoint: string, fileName: string): Promise<void> {
    const blob = await httpClient<Blob>(endpoint, {
        method: HttpMethod.GET,
        parseAs: "blob",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
}
