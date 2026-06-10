import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BREEDS, BREED_PERSONAS, type Breed } from '@/lib/character/types';
import { getCharacterCardUrl } from '@/lib/character/asset-url';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBreed: Breed | null;
  recommendedBreed: Breed | null;
  onSelect: (breed: Breed) => void | Promise<void>;
}

export function CharacterSelectModal({
  open,
  onOpenChange,
  currentBreed,
  recommendedBreed,
  onSelect,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>마스코트 선택</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {BREEDS.map((breed) => {
            const persona = BREED_PERSONAS[breed];
            const isCurrent = breed === currentBreed;
            const isRecommended = breed === recommendedBreed;
            return (
              <Card
                key={breed}
                onClick={() => onSelect(breed)}
                className={`p-4 cursor-pointer transition hover:scale-[1.02] ${
                  isCurrent ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="relative">
                  <img
                    src={getCharacterCardUrl(breed)}
                    alt={persona.koreanName}
                    className="w-full aspect-square object-contain"
                    loading="lazy"
                  />
                  {isRecommended && (
                    <Badge className="absolute top-1 right-1">✨ 당신과 잘 맞아요</Badge>
                  )}
                </div>
                <div className="mt-3">
                  <div className="font-bold">{persona.koreanName}</div>
                  <div className="text-sm text-muted-foreground">{persona.personaName}</div>
                  <div className="text-xs mt-1">{persona.copy}</div>
                </div>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
