import { useCallback, useEffect, useState } from 'react';

import { api, apiUrl } from '@/lib/api';
import type { PackageDto, TrainerCardDto, TrainerDetailDto } from '@/lib/apiTypes';

/** The PT directory on backend-core: verified PTs with an active marketplace subscription. */

export type City = 'Lisboa' | 'Porto' | 'Braga' | 'Coimbra' | 'Online';
export type Specialty = 'Hipertrofia' | 'Perda de peso' | 'Força' | 'Mobilidade' | 'Powerlifting';

export type Package = { id: string; name: string; description: string; price: number; period: 'mês' | 'avulso' };

export type Trainer = {
  id: string;
  name: string;
  /** Article used in copy ("a Rita", "o Tiago") — authored with the profile, never guessed. */
  article: 'a' | 'o';
  photoUri: string | null;
  verified: boolean;
  specialties: string;
  tags: string[];
  /** "4,9", or null before the first review. */
  rating: string | null;
  reviews: number;
  where: string;
  cities: string[];
  fromPrice: number | null;
  students: number;
  bio: string;
  packages: Package[];
};

const rating = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function toPackage(p: PackageDto): Package {
  return { id: p.id, name: p.name, description: p.description, price: p.priceCents / 100, period: p.period === 'month' ? 'mês' : 'avulso' };
}

export function toTrainer(card: TrainerCardDto, detail?: TrainerDetailDto): Trainer {
  return {
    id: card.id,
    name: card.name,
    article: card.article,
    photoUri: card.photoUrl ? apiUrl(card.photoUrl) : null,
    verified: card.verified,
    specialties: card.specialties.join(' · '),
    tags: card.specialties,
    rating: card.rating === null ? null : rating.format(card.rating),
    reviews: card.reviews,
    where: card.where,
    cities: card.online ? [card.city, 'Online'] : [card.city],
    fromPrice: card.fromPriceCents === null ? null : card.fromPriceCents / 100,
    students: card.students,
    bio: detail?.bio ?? '',
    packages: detail?.packages.map(toPackage) ?? [],
  };
}

export function useTrainers() {
  const [state, setState] = useState<{ trainers: Trainer[] | null; error: boolean }>({ trainers: null, error: false });
  const reload = useCallback(
    () =>
      api
        .get<TrainerCardDto[]>('/api/v1/trainers')
        .then((list) => setState({ trainers: list.map((t) => toTrainer(t)), error: false }))
        .catch(() => setState((s) => ({ ...s, error: true }))),
    [],
  );
  useEffect(() => {
    reload();
  }, [reload]);
  return { trainers: state.trainers, error: state.error, reload };
}

export function useTrainer(id: string | undefined) {
  const [state, setState] = useState<{ id: string; trainer: Trainer | null; missing: boolean } | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    api
      .get<TrainerDetailDto>(`/api/v1/trainers/${id}`)
      .then((d) => alive && setState({ id, trainer: toTrainer(d.trainer, d), missing: false }))
      .catch(() => alive && setState({ id, trainer: null, missing: true }));
    return () => {
      alive = false;
    };
  }, [id]);
  const current = state && state.id === id ? state : null;
  return { trainer: current?.trainer ?? null, missing: current?.missing ?? false };
}

export const cities: City[] = ['Lisboa', 'Porto', 'Braga', 'Coimbra', 'Online'];
export const specialties: Specialty[] = ['Hipertrofia', 'Perda de peso', 'Força'];
