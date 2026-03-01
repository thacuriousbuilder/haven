
import { createContext, useContext, useState } from 'react';

interface TrainerOnboardingData {
  specialties: string[];
  clientCountRange: string;
}

interface TrainerOnboardingContextType {
  data: TrainerOnboardingData;
  setSpecialties: (s: string[]) => void;
  setClientCountRange: (r: string) => void;
}

const TrainerOnboardingContext = createContext<TrainerOnboardingContextType | null>(null);

export function TrainerOnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<TrainerOnboardingData>({
    specialties: [],
    clientCountRange: '',
  });

  function setSpecialties(specialties: string[]) {
    setData(prev => ({ ...prev, specialties }));
  }

  function setClientCountRange(clientCountRange: string) {
    setData(prev => ({ ...prev, clientCountRange }));
  }

  return (
    <TrainerOnboardingContext.Provider value={{ data, setSpecialties, setClientCountRange }}>
      {children}
    </TrainerOnboardingContext.Provider>
  );
}

export function useTrainerOnboarding() {
  const ctx = useContext(TrainerOnboardingContext);
  if (!ctx) throw new Error('useTrainerOnboarding must be used within TrainerOnboardingProvider');
  return ctx;
}