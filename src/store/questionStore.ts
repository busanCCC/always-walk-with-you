import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DifficultyLevel } from '@/utils/questionUtils';

interface QuestionState {
  difficulty: DifficultyLevel;
  setDifficulty: (difficulty: DifficultyLevel) => void;
}

export const useQuestionStore = create<QuestionState>()(
  persist(
    (set) => ({
      difficulty: 'normal', // 기본값은 일반
      setDifficulty: (difficulty: DifficultyLevel) => {
        set({ difficulty });
      },
    }),
    {
      name: 'question-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
