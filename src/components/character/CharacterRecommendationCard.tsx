import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BREED_PERSONAS, type Breed } from '@/lib/character/types';
import { getCharacterCardUrl } from '@/lib/character/asset-url';

interface Props {
  topBreed: Breed;
  runnerUpBreed?: Breed;
  onSelect: (breed: Breed) => void;
  onOpenAll: () => void;
}

export function CharacterRecommendationCard({
  topBreed,
  runnerUpBreed,
  onSelect,
  onOpenAll,
}: Props) {
  const persona = BREED_PERSONAS[topBreed];
  return (
    <Card className="p-6 rounded-2xl border-border/50 shadow-sm">
      <h3 className="text-lg font-bold">💫 당신과 가장 잘 맞는 마스코트</h3>
      <div className="flex gap-4 mt-4 items-start">
        <div className="flex-1 text-center">
          <img
            src={getCharacterCardUrl(topBreed)}
            alt={persona.koreanName}
            className="w-32 h-32 mx-auto object-contain"
            loading="lazy"
          />
          <div className="font-bold mt-2">{persona.koreanName}</div>
          <div className="text-sm text-muted-foreground">"{persona.personaName}"</div>
          <p className="text-sm mt-2">{persona.copy}</p>
        </div>
        {runnerUpBreed && (
          <div className="flex-1 text-center opacity-80">
            <img
              src={getCharacterCardUrl(runnerUpBreed)}
              alt={BREED_PERSONAS[runnerUpBreed].koreanName}
              className="w-24 h-24 mx-auto object-contain"
              loading="lazy"
            />
            <div className="font-bold mt-2 text-sm">
              {BREED_PERSONAS[runnerUpBreed].koreanName}
            </div>
            <div className="text-xs text-muted-foreground">"{BREED_PERSONAS[runnerUpBreed].personaName}"</div>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <Button className="flex-1" onClick={() => onSelect(topBreed)}>
          이 캐릭터로 선택
        </Button>
        <Button variant="outline" onClick={onOpenAll}>
          다른 캐릭터 보기
        </Button>
      </div>
    </Card>
  );
}
