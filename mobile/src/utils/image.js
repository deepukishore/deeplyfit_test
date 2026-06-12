import * as ImageManipulator from 'expo-image-manipulator';

export const compressImageUri = async (uri, options = {}) => {
  const { maxWidth = 1400, maxHeight = 1400, quality = 0.82 } = options;
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth, height: maxHeight } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return `data:image/jpeg;base64,${result.base64}`;
};
