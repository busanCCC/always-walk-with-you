import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Emotion } from '@/types/journal';
import { fetchEmotions } from '@/apis/journalApi';

const EMOTIONS_STORAGE_KEY = 'stored_emotions';
const EMOTIONS_LAST_SYNC_KEY = 'emotions_last_sync';
const EMOTIONS_DIRECTORY = FileSystem.documentDirectory + 'emotions/';

// 로컬에 저장된 감정 데이터 타입 (로컬 파일 경로 포함)
export interface LocalEmotion extends Omit<Emotion, 'img_url'> {
  img_url: string; // 원본 URL
  local_img_path?: string; // 로컬 파일 경로
  is_downloaded: boolean; // 다운로드 완료 여부
}

/**
 * 감정 이미지 저장 디렉토리 생성
 */
const ensureEmotionsDirectory = async (): Promise<void> => {
  const dirInfo = await FileSystem.getInfoAsync(EMOTIONS_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(EMOTIONS_DIRECTORY, { intermediates: true });
  }
};

/**
 * 감정 이미지 다운로드
 */
const downloadEmotionImage = async (emotion: Emotion): Promise<string | null> => {
  try {
    if (!emotion.img_url) return null;

    await ensureEmotionsDirectory();

    // 파일 확장자 추출 (기본값: jpg)
    const urlParts = emotion.img_url.split('.');
    const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'jpg';
    const localFileName = `${emotion.id}.${extension}`;
    const localPath = EMOTIONS_DIRECTORY + localFileName;

    // 이미 다운로드된 파일이 있는지 확인
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      return localPath;
    }

    // 이미지 다운로드
    const downloadResult = await FileSystem.downloadAsync(emotion.img_url, localPath);

    if (downloadResult.status === 200) {
      return localPath;
    } else {
      console.warn(
        `Failed to download emotion image for ${emotion.name}: ${downloadResult.status}`
      );
      return null;
    }
  } catch (error) {
    console.error(`Error downloading emotion image for ${emotion.name}:`, error);
    return null;
  }
};

/**
 * 서버에서 감정 데이터 가져와서 로컬에 저장
 */
export const syncEmotionsFromServer = async (): Promise<LocalEmotion[]> => {
  try {
    // 서버에서 최신 감정 데이터 가져오기
    const serverEmotions = await fetchEmotions();

    // 기존 로컬 감정 데이터 가져오기
    const existingEmotions = await getLocalEmotions();
    const existingEmotionsMap = new Map(existingEmotions.map((e) => [e.id, e]));

    const updatedEmotions: LocalEmotion[] = [];

    for (const serverEmotion of serverEmotions) {
      const existingEmotion = existingEmotionsMap.get(serverEmotion.id);

      // 새로운 감정이거나 URL이 변경된 경우
      if (!existingEmotion || existingEmotion.img_url !== serverEmotion.img_url) {
        const localPath = await downloadEmotionImage(serverEmotion);

        const localEmotion: LocalEmotion = {
          ...serverEmotion,
          local_img_path: localPath || undefined,
          is_downloaded: !!localPath,
        };

        updatedEmotions.push(localEmotion);
      } else {
        // 기존 감정 유지 (로컬 파일 경로 보존)
        updatedEmotions.push(existingEmotion);
      }
    }

    // 로컬 저장
    await saveEmotionsToLocal(updatedEmotions);
    await AsyncStorage.setItem(EMOTIONS_LAST_SYNC_KEY, new Date().toISOString());

    console.log(`✅ 감정 데이터 동기화 완료: ${updatedEmotions.length}개 감정 데이터`);
    return updatedEmotions;
  } catch (error) {
    console.error('❌ Error syncing emotions from server:', error);

    // 실패 시 로컬 데이터 반환
    const localEmotions = await getLocalEmotions();
    if (localEmotions.length > 0) {
      console.log('📱 로컬 감정 데이터 사용');
      return localEmotions;
    }

    throw error;
  }
};

/**
 * 로컬에 감정 데이터 저장
 */
const saveEmotionsToLocal = async (emotions: LocalEmotion[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(EMOTIONS_STORAGE_KEY, JSON.stringify(emotions));
  } catch (error) {
    console.error('Error saving emotions to local storage:', error);
    throw error;
  }
};

/**
 * 로컬에서 감정 데이터 가져오기
 */
export const getLocalEmotions = async (): Promise<LocalEmotion[]> => {
  try {
    const storedData = await AsyncStorage.getItem(EMOTIONS_STORAGE_KEY);
    if (storedData) {
      return JSON.parse(storedData) as LocalEmotion[];
    }
    return [];
  } catch (error) {
    console.error('Error getting emotions from local storage:', error);
    return [];
  }
};

/**
 * 마지막 동기화 시간 가져오기
 */
export const getLastSyncTime = async (): Promise<Date | null> => {
  try {
    const lastSync = await AsyncStorage.getItem(EMOTIONS_LAST_SYNC_KEY);
    return lastSync ? new Date(lastSync) : null;
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
};

/**
 * 동기화가 필요한지 확인 (24시간 기준)
 */
export const shouldSyncEmotions = async (): Promise<boolean> => {
  try {
    const lastSync = await getLastSyncTime();
    if (!lastSync) return true;

    const now = new Date();
    const diffHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

    return diffHours >= 24; // 24시간 이상 지났으면 동기화 필요
  } catch (error) {
    console.error('Error checking sync requirement:', error);
    return true;
  }
};

/**
 * 로컬 감정 데이터를 Emotion 형태로 변환 (기존 API와 호환성 유지)
 */
export const convertToEmotions = (localEmotions: LocalEmotion[]): Emotion[] => {
  return localEmotions.map((emotion) => ({
    id: emotion.id,
    name: emotion.name,
    img_url: emotion.local_img_path || emotion.img_url, // 로컬 파일 우선, 없으면 원본 URL
    description: emotion.description,
    created_at: emotion.created_at,
    updated_at: emotion.updated_at,
  }));
};

/**
 * 강제로 서버에서 감정 데이터를 동기화 (기존 캐시 무시)
 */
export const forceSyncEmotions = async (): Promise<LocalEmotion[]> => {
  try {
    console.log('🔄 감정 데이터 동기화 시작...');

    // 서버에서 최신 감정 데이터 가져오기
    const serverEmotions = await fetchEmotions();
    const updatedEmotions: LocalEmotion[] = [];

    // 모든 감정 이미지 다운로드
    for (const serverEmotion of serverEmotions) {
      console.log(`📥 감정 이미지 다운로드 시작: ${serverEmotion.name}`);

      const localPath = await downloadEmotionImage(serverEmotion);

      const localEmotion: LocalEmotion = {
        ...serverEmotion,
        local_img_path: localPath || undefined,
        is_downloaded: !!localPath,
      };

      updatedEmotions.push(localEmotion);
    }

    // 로컬 저장
    await saveEmotionsToLocal(updatedEmotions);
    await AsyncStorage.setItem(EMOTIONS_LAST_SYNC_KEY, new Date().toISOString());

    console.log(`✅ Force sync completed: ${updatedEmotions.length} emotions`);
    return updatedEmotions;
  } catch (error) {
    console.error('❌ Error in force sync emotions:', error);
    throw error;
  }
};

/**
 * 로컬 캐시 클리어 (개발/디버깅용)
 */
export const clearEmotionsCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(EMOTIONS_STORAGE_KEY);
    await AsyncStorage.removeItem(EMOTIONS_LAST_SYNC_KEY);

    // 로컬 이미지 파일들 삭제
    const dirInfo = await FileSystem.getInfoAsync(EMOTIONS_DIRECTORY);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(EMOTIONS_DIRECTORY);
    }

    console.log('🗑️ Emotions cache cleared');
  } catch (error) {
    console.error('Error clearing emotions cache:', error);
  }
};

/**
 * 캐시 상태 정보 가져오기 (개발/디버깅용)
 */
export const getEmotionsCacheInfo = async () => {
  try {
    const localEmotions = await getLocalEmotions();
    const lastSync = await getLastSyncTime();
    const needsSync = await shouldSyncEmotions();

    // 다운로드된 이미지 수 계산
    const downloadedCount = localEmotions.filter((e) => e.is_downloaded).length;

    // 디렉토리 정보
    const dirInfo = await FileSystem.getInfoAsync(EMOTIONS_DIRECTORY);
    let directorySize = 0;

    if (dirInfo.exists) {
      try {
        const files = await FileSystem.readDirectoryAsync(EMOTIONS_DIRECTORY);
        for (const file of files) {
          const fileInfo = await FileSystem.getInfoAsync(EMOTIONS_DIRECTORY + file);
          if (fileInfo.exists && fileInfo.size) {
            directorySize += fileInfo.size;
          }
        }
      } catch (error) {
        console.warn('Error calculating directory size:', error);
      }
    }

    return {
      totalEmotions: localEmotions.length,
      downloadedImages: downloadedCount,
      lastSyncTime: lastSync,
      needsSync,
      directoryExists: dirInfo.exists,
      directorySizeBytes: directorySize,
      directorySizeMB: Math.round((directorySize / 1024 / 1024) * 100) / 100,
    };
  } catch (error) {
    console.error('Error getting cache info:', error);
    return null;
  }
};
