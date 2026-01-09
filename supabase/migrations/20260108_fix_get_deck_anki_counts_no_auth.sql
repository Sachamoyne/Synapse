drop function if exists get_deck_anki_counts(uuid[]);

create function get_deck_anki_counts(deck_ids uuid[])
returns table (
  deck_id uuid,
  new_due int,
  learning_due int,
  review_due int,
  total_cards int
)
language sql
as $$
with recursive deck_tree as (
  select d.id, d.user_id, d.id as root_id
  from decks d
  where d.id = any(deck_ids)

  union all

  select child.id, child.user_id, dt.root_id
  from decks child
  join deck_tree dt on child.parent_deck_id = dt.id
)
select
  root.id as deck_id,
  least(
    coalesce(due_counts.new_due, 0),
    coalesce(limits.new_limit, coalesce(due_counts.new_due, 0))
  )::int as new_due,
  coalesce(due_counts.learning_due, 0)::int as learning_due,
  least(
    coalesce(due_counts.review_due, 0),
    coalesce(limits.review_limit, coalesce(due_counts.review_due, 0))
  )::int as review_due,
  coalesce(total_counts.total_cards, 0)::int as total_cards
from unnest(deck_ids) as root(id)
left join lateral (
  select
    count(*) filter (
      where c.state = 'new'
        and c.due_at <= to_timestamp(floor(extract(epoch from now())))
    ) as new_due,
    count(*) filter (
      where c.state in ('learning','relearning')
        and c.due_at <= to_timestamp(floor(extract(epoch from now())))
    ) as learning_due,
    count(*) filter (
      where c.state in ('review','learning','relearning')
        and c.due_at <= to_timestamp(floor(extract(epoch from now())))
    ) as review_due
  from cards c
  join deck_tree dt on c.deck_id = dt.id
  where dt.root_id = root.id
    and c.suspended = false
) as due_counts on true
left join lateral (
  select
    coalesce(ds.new_cards_per_day, us.default_new_per_day, 20) as new_limit,
    coalesce(ds.max_reviews_per_day, us.default_reviews_per_day, 9999) as review_limit
  from decks d
  left join deck_settings ds on ds.deck_id = d.id and ds.user_id = d.user_id
  left join user_settings us on us.user_id = d.user_id
  where d.id = root.id
) as limits on true
left join lateral (
  select count(*) as total_cards
  from cards c
  join deck_tree dt on c.deck_id = dt.id
  where dt.root_id = root.id
) as total_counts on true;
$$;
