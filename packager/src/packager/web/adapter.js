import assetCache from './cache';
import request from '../../common/request';
import {readAsURL, readAsArrayBuffer} from '../../common/readers';
import defaultIcon from '../images/default-icon.png';

class WebAdapter {
  getCachedAsset (asset) {
    return assetCache.get(asset)
  }

  async cacheAsset (asset, result) {
    await assetCache.set(asset, result);
  }

  getAppIcon (file) {
    if (!file) {
      return request({
        url: defaultIcon,
        type: 'arraybuffer'
      });
    }
    // Convert to PNG
    if (file.type === 'image/png') {
      return readAsArrayBuffer(file);
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        image.onload = null;
        image.onerror = null;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get rendering context for icon conversion'));
          return;
        }
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          resolve(readAsArrayBuffer(blob));
        });
      };
      image.onerror = () => {
        image.onload = null;
        image.onerror = null;
        reject(new Error('Cannot load icon'));
      };
      image.src = url;
    });
  }

  /**
   * @param {ArrayBuffer} pngData PNG image
   * @param {number} size Width and height of the result
   * @returns {Promise<ArrayBuffer>} square PNG with the image centered in it
   */
  resizeIcon (pngData, size) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([pngData], {type: 'image/png'}));
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get rendering context for icon resizing'));
          return;
        }
        const scale = Math.min(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        canvas.toBlob((blob) => {
          resolve(readAsArrayBuffer(blob));
        }, 'image/png');
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Cannot load icon'));
      };
      image.src = url;
    });
  }

  readAsURL (file, debugInfo) {
    return readAsURL(file)
      .catch((err) => {
        throw new Error(`${debugInfo}: ${err}`);
      });
  }

  fetchExtensionScript (url) {
    return request({
      type: 'text',
      url: url
    });
  }
}

export default WebAdapter;
