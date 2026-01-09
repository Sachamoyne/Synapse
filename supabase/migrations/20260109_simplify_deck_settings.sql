alter table deck_settings
  drop column if exists learning_mode,
  drop column if exists again_delay_minutes,
  drop column if exists learning_steps,
  drop column if exists relearning_steps,
  drop column if exists graduating_interval_days,
  drop column if exists easy_interval_days,
  drop column if exists starting_ease,
  drop column if exists easy_bonus,
  drop column if exists hard_interval,
  drop column if exists interval_modifier,
  drop column if exists new_interval_multiplier,
  drop column if exists minimum_interval_days,
  drop column if exists maximum_interval_days;
