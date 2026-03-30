begin;

alter table public.customer_plans
  drop constraint if exists customer_plans_plan_id_check;

alter table public.customer_plans
  add constraint customer_plans_plan_id_check
  check (
    plan_id in (
      'free',
      'starter',
      'pro',
      'max',
      'cv_starter',
      'cv_plus',
      'cv_unlimited'
    )
  );

commit;
