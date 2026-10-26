/**
 * Shrink and crop a picture so it fills a box of the given size.
 * @param {Blob|string} source A picture file, or the address of a picture.
 * @param {number} width Width of the new picture.
 * @param {number} height Height of the new picture.
 * @returns {Promise<Blob>} A WebP picture (PNG where WebP isn't supported).
 */
const resizeImage = (source, width, height) => new Promise((resolve, reject) => {
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    const done = () => {
        if (url !== source) URL.revokeObjectURL(url);
    };
    const image = new Image();
    image.onload = () => {
        done();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const scale = Math.max(width / image.width, height / image.height);
        const drawnWidth = image.width * scale;
        const drawnHeight = image.height * scale;
        canvas.getContext('2d')
            .drawImage(image, (width - drawnWidth) / 2, (height - drawnHeight) / 2, drawnWidth, drawnHeight);
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('That picture couldn\'t be used. Try another one.'));
        }, 'image/webp', 0.85);
    };
    image.onerror = () => {
        done();
        reject(new Error('That file isn\'t a picture PebbleIDE can use. Try a PNG or JPEG.'));
    };
    image.src = url;
});

export {
    resizeImage
};
