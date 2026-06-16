'use server';

export async function uploadToCatboxServer(formData: FormData) {
    try {
        const response = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Catbox error: ${response.statusText}`);
        }

        const url = await response.text();
        
        if (url && url.startsWith("http")) {
            return { success: true, url: url.trim() };
        } else {
            throw new Error(url || "Không lấy được link ảnh từ Catbox.");
        }

    } catch (error: any) {
        console.error("Catbox Upload Error:", error);
        return { success: false, error: error.message };
    }
}
