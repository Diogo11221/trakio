-- Exercise library (mobile plans + admin "Biblioteca") and the Trakio A · B · C template.

insert into exercises (id, slug, name, muscle_group, muscles, equipment, demo_status, created_at, updated_at, version) values
    (gen_random_uuid(), 'supino-plano',           'Supino plano',             'CHEST',     'Peito, tríceps',             'Barra e banco', 'READY',      now(), now(), 0),
    (gen_random_uuid(), 'supino-inclinado',       'Supino inclinado',         'CHEST',     'Peito superior, ombros',     'Barra e banco', 'READY',      now(), now(), 0),
    (gen_random_uuid(), 'supino-halteres',        'Supino com halteres',      'CHEST',     'Peito, tríceps',             'Halteres e banco', 'TODO',    now(), now(), 0),
    (gen_random_uuid(), 'crucifixo-polia',        'Crucifixo na polia',       'CHEST',     'Peito',                      'Polia',         'READY',      now(), now(), 0),
    (gen_random_uuid(), 'peck-deck',              'Peck deck',                'CHEST',     'Peito',                      'Máquina',       'PRODUCTION', now(), now(), 0),
    (gen_random_uuid(), 'flexoes',                'Flexões',                  'CHEST',     'Peito, tríceps, core',       'Peso do corpo', 'TODO',       now(), now(), 0),
    (gen_random_uuid(), 'puxada-frente',          'Puxada à frente',          'BACK',      'Dorsais, bíceps',            'Polia',         'READY',      now(), now(), 0),
    (gen_random_uuid(), 'remada-curvada',         'Remada curvada',           'BACK',      'Costas, bíceps',             'Barra',         'READY',      now(), now(), 0),
    (gen_random_uuid(), 'remada-sentado',         'Remada com cabo sentado',  'BACK',      'Costas, bíceps',             'Polia',         'TODO',       now(), now(), 0),
    (gen_random_uuid(), 'pullover-polia',         'Pullover na polia',        'BACK',      'Dorsais',                    'Polia',         'TODO',       now(), now(), 0),
    (gen_random_uuid(), 'peso-morto',             'Peso morto',               'BACK',      'Costas, glúteos, posterior da coxa', 'Barra', 'READY',      now(), now(), 0),
    (gen_random_uuid(), 'elevacoes-laterais',     'Elevações laterais',       'SHOULDERS', 'Ombros',                     'Halteres',      'READY',      now(), now(), 0),
    (gen_random_uuid(), 'desenvolvimento-militar','Desenvolvimento militar',  'SHOULDERS', 'Ombros, tríceps',            'Barra',         'TODO',       now(), now(), 0),
    (gen_random_uuid(), 'face-pull',              'Face pull',                'SHOULDERS', 'Ombros posteriores',         'Polia',         'TODO',       now(), now(), 0),
    (gen_random_uuid(), 'triceps-corda',          'Tríceps na corda',         'ARMS',      'Tríceps',                    'Polia',         'TODO',       now(), now(), 0),
    (gen_random_uuid(), 'rosca-direta',           'Rosca direta',             'ARMS',      'Bíceps',                     'Barra',         'TODO',       now(), now(), 0),
    (gen_random_uuid(), 'curl-halteres',          'Curl com halteres',        'ARMS',      'Bíceps',                     'Halteres',      'TODO',       now(), now(), 0),
    (gen_random_uuid(), 'agachamento',            'Agachamento',              'LEGS',      'Quadríceps, glúteos',        'Barra',         'READY',      now(), now(), 0),
    (gen_random_uuid(), 'leg-press',              'Leg press',                'LEGS',      'Quadríceps, glúteos',        'Máquina',       'READY',      now(), now(), 0),
    (gen_random_uuid(), 'peso-morto-romeno',      'Peso morto romeno',        'LEGS',      'Posterior da coxa, glúteos', 'Barra',         'READY',      now(), now(), 0),
    (gen_random_uuid(), 'extensao-pernas',        'Extensão de pernas',       'LEGS',      'Quadríceps',                 'Máquina',       'TODO',       now(), now(), 0),
    (gen_random_uuid(), 'curl-femoral',           'Curl femoral',             'LEGS',      'Posterior da coxa',          'Máquina',       'TODO',       now(), now(), 0),
    (gen_random_uuid(), 'hip-thrust',             'Hip thrust',               'LEGS',      'Glúteos, posterior da coxa', 'Barra e banco', 'PRODUCTION', now(), now(), 0),
    (gen_random_uuid(), 'gemeos-pe',              'Gémeos em pé',             'LEGS',      'Gémeos',                     'Máquina',       'TODO',       now(), now(), 0),
    (gen_random_uuid(), 'afundos',                'Afundos',                  'LEGS',      'Quadríceps, glúteos',        'Halteres',      'TODO',       now(), now(), 0),
    (gen_random_uuid(), 'prancha',                'Prancha',                  'CORE',      'Abdominais, lombar',         'Peso do corpo', 'TODO',       now(), now(), 0);

-- Trakio template "Treino A · B · C" — the plan a client follows until a PT assigns one.
insert into workout_plans (id, owner_id, client_id, name, weeks, workouts_per_week, created_at, updated_at, version) values
    ('a0000000-0000-4000-8000-000000000001', null, null, 'Treino A · B · C', 12, 3, now(), now(), 0);

insert into plan_days (id, plan_id, position, label, focus) values
    ('a0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-000000000001', 0, 'Treino A', 'Peito'),
    ('a0000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-000000000001', 1, 'Treino B', 'Costas'),
    ('a0000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-000000000001', 2, 'Treino C', 'Pernas');

insert into plan_exercises (id, day_id, position, exercise_id, sets, reps_min, reps_max, rest_seconds, reference_kg, note)
select gen_random_uuid(), d.day_id::uuid, d.position, e.id, d.sets, d.reps, d.reps, d.rest, d.kg, ''
from (values
    ('a0000000-0000-4000-8000-0000000000a1', 0, 'supino-plano',        4, 8,  120, 85.0),
    ('a0000000-0000-4000-8000-0000000000a1', 1, 'supino-inclinado',    4, 8,  120, 80.0),
    ('a0000000-0000-4000-8000-0000000000a1', 2, 'crucifixo-polia',     3, 12, 90,  17.5),
    ('a0000000-0000-4000-8000-0000000000a1', 3, 'peck-deck',           3, 12, 90,  45.0),
    ('a0000000-0000-4000-8000-0000000000a1', 4, 'elevacoes-laterais',  4, 15, 60,  10.0),
    ('a0000000-0000-4000-8000-0000000000a1', 5, 'triceps-corda',       3, 12, 60,  25.0),
    ('a0000000-0000-4000-8000-0000000000b1', 0, 'puxada-frente',       4, 10, 90,  60.0),
    ('a0000000-0000-4000-8000-0000000000b1', 1, 'remada-curvada',      4, 8,  120, 70.0),
    ('a0000000-0000-4000-8000-0000000000b1', 2, 'remada-sentado',      3, 12, 90,  55.0),
    ('a0000000-0000-4000-8000-0000000000b1', 3, 'pullover-polia',      3, 12, 60,  25.0),
    ('a0000000-0000-4000-8000-0000000000b1', 4, 'rosca-direta',        3, 10, 60,  30.0),
    ('a0000000-0000-4000-8000-0000000000b1', 5, 'face-pull',           3, 15, 60,  20.0),
    ('a0000000-0000-4000-8000-0000000000c1', 0, 'agachamento',         4, 6,  150, 120.0),
    ('a0000000-0000-4000-8000-0000000000c1', 1, 'leg-press',           4, 10, 120, 200.0),
    ('a0000000-0000-4000-8000-0000000000c1', 2, 'peso-morto-romeno',   3, 8,  120, 100.0),
    ('a0000000-0000-4000-8000-0000000000c1', 3, 'extensao-pernas',     3, 12, 60,  50.0),
    ('a0000000-0000-4000-8000-0000000000c1', 4, 'curl-femoral',        3, 12, 60,  40.0),
    ('a0000000-0000-4000-8000-0000000000c1', 5, 'hip-thrust',          3, 10, 90,  100.0),
    ('a0000000-0000-4000-8000-0000000000c1', 6, 'gemeos-pe',           4, 15, 60,  60.0)
) as d(day_id, position, slug, sets, reps, rest, kg)
join exercises e on e.slug = d.slug;
