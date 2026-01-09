create or replace function get_deck_anki_counts(deck_ids uuid[])
returns table (
  deck_id uuid,
  new_due bigint,
  learning_due bigint,
  review_due bigint,
  total_active bigint
)
language sql
as $$
with recursive deck_tree as (
  select id
  from decks
  where id = any(deck_ids)

  union all

  select d.id
  from decks d
  join deck_tree dt on d.parent_deck_id = dt.id
),
cards_base as (
  select *
  from cards
  where deck_id in (select id from deck_tree)
    and suspended = false
)
select
  root.id as deck_id,

  count(*) filter (
    where state = 'new'
      and due_at <= now()
  ) as new_due,

  count(*) filter (
    where state in ('learning','relearning')
      and due_at <= now()
  ) as learning_due,

  count(*) filter (
    where state = 'review'
      and due_at <= now()
  ) as review_due,

  count(*) as total_active

from unnest(deck_ids) as root(id)
left join cards_base c on true
group by root.id;
$$;
