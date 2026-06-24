self.onmessage = async (e) => {
    const blob = e.data;

    const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
            resolve(reader.result.split(',')[1]);
        };

        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    self.postMessage(base64);
};