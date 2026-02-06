import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadImage(uri: string, path: string): Promise<string> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Create a unique filename if path is a folder, or use path as is
    const finalPath = path.endsWith('/') ? `${path}${Date.now()}.jpg` : path;
    const storageRef = ref(storage, finalPath);
    
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}
