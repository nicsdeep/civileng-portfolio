-- Moves the owner's research proposal from Projects (added by
-- 20261120090000_pf_owner_research.sql) into the new Research section, with its
-- aim, objectives, method stages and significance as separate fields.
-- Same targeting as before: the portfolio first published at
-- "3453-caribou-crescent". Does nothing if it is not found. Re-running is
-- harmless (the item is replaced, not duplicated). Visibility is unchanged.
-- Also adds the University of Leeds degree if it is missing (see below).

do $$
declare
  owner uuid;
  doc jsonb;
  item jsonb;
  t text := 'Integrated Artificial Intelligence and Digital Twin Modeling for Resilient and Optimized Infrastructure Planning in the Arctic Region';
begin
  select user_id into owner from public.pf_profiles where slug = '3453-caribou-crescent';
  if owner is null then
    select user_id into owner from public.pf_slug_history where slug = '3453-caribou-crescent';
  end if;
  if owner is null then
    raise notice 'Owner portfolio not found; nothing to update.';
    return;
  end if;
  select content into doc from public.pf_profiles where user_id = owner;
  if doc is null then
    return;
  end if;

  item := jsonb_build_object(
    'title', t,
    'kind', 'Research proposal',
    'year', '2026',
    'summary', 'Critical infrastructure systems in Northern Canada (transportation, energy, telecommunications, water and wastewater, housing, health and education) face challenges from permafrost degradation, extreme cold, freeze–thaw cycles, flooding, seasonal variability, remoteness, short construction seasons and limited resources. These conditions increase lifecycle costs, create uncertainty in deterioration and maintenance, and complicate long-term planning and asset management. Climate hazards can affect several interdependent systems at once, and traditional approaches based on historical data, periodic inspections and deterministic, asset-specific models struggle under changing conditions. Artificial Intelligence offers predictive analytics, anomaly detection, risk assessment and optimization, while Digital Twins integrate BIM, GIS, sensor, remote-sensing, climate and asset-management data for monitoring, simulation and scenario analysis. Integrated AI–Digital Twin applications for remote Arctic infrastructure remain limited by sparse data, connectivity, interoperability and climate uncertainty. This research proposes an integrated AI–Digital Twin framework combining predictive modeling, climate-risk and resilience assessment, interdependency analysis, simulation and multi-objective optimization.',
    'aim', 'To develop an integrated Artificial Intelligence and Digital Twin modeling framework for resilient and optimized infrastructure planning in the Arctic region, capable of predicting infrastructure performance and deterioration, evaluating climate-related risks and interdependencies, and supporting cost-effective, sustainable and resilient infrastructure decisions under uncertain future conditions.',
    'objectives', jsonb_build_array(
      'Develop an integrated AI–Digital Twin framework combining BIM, GIS, asset, sensor, remote-sensing and climate data for Arctic infrastructure planning.',
      'Develop AI models to predict infrastructure deterioration, maintenance needs and failures under Arctic climate hazards.',
      'Integrate climate risks, infrastructure interdependencies, cascading impacts and resilience assessment.',
      'Develop and validate a multi-objective AI decision-support framework to optimize cost, risk, performance, resilience and sustainability using Northern Canadian case studies.'),
    'method', jsonb_build_array(
      'Data acquisition: infrastructure, environmental and climate data from selected Northern Canadian communities (BIM, GIS, asset management, inspections, sensors/IoT, remote sensing, climate, permafrost, maintenance, failure and socioeconomic data), with data quality, integration and uncertainty assessed.',
      'Digital Twin development: integrating BIM/GIS, sensor, climate, infrastructure, AI, simulation and optimization data to represent selected systems and their interdependencies, using appropriate interoperability standards.',
      'AI prediction: models for deterioration, remaining useful life, failure probability, maintenance requirements, climate-related damage, service disruption and cascading impacts, integrated into the Digital Twin.',
      'Climate and resilience modeling: climate projections and infrastructure interdependencies modeled to assess future performance, disruptions, cascading impacts and resilience.',
      'Optimization: maintenance, rehabilitation, adaptation, retrofitting, replacement and investment strategies evaluated by multi-objective optimization on cost, risk, performance, resilience, sustainability and emissions.',
      'Validation: Northern Canadian case studies validating model accuracy, Digital Twin performance, resilience, optimization outcomes, uncertainty and applicability, incorporating stakeholder and Indigenous knowledge where appropriate.',
      'Decision support: an integrated platform providing predictions, risk visualization, scenario analysis, lifecycle costs, resilience indicators and optimized planning strategies.'),
    'significance', 'The research supports a transition from reactive, asset-specific planning toward predictive, integrated, resilient and data-driven infrastructure management. AI provides predictive capability for deterioration, failure, maintenance needs and climate-related risks; the Digital Twin integrates infrastructure, climate, operational and interdependency data for simulation and scenario assessment; resilience modeling evaluates interdependencies and cascading impacts; and multi-objective optimization compares strategies on cost, risk, performance, resilience, sustainability and emissions. The resulting framework offers a decision-support approach adapted to Arctic conditions for municipalities, infrastructure agencies, Indigenous communities and policymakers.',
    'keywords', jsonb_build_array('Artificial Intelligence', 'Digital Twin', 'BIM', 'GIS', 'Climate resilience', 'Multi-objective optimization', 'Asset management', 'Arctic infrastructure'),
    'links', '[]'::jsonb
  );

  doc := jsonb_set(doc, '{research}',
    jsonb_build_array(item) || coalesce(
      (select jsonb_agg(r) from jsonb_array_elements(coalesce(doc->'research', '[]'::jsonb)) r where r->>'title' is distinct from t),
      '[]'::jsonb));
  doc := jsonb_set(doc, '{projects}', coalesce(
      (select jsonb_agg(p) from jsonb_array_elements(coalesce(doc->'projects', '[]'::jsonb)) p where p->>'title' is distinct from t),
      '[]'::jsonb));

  -- Fix for 20261120090000: it matched schools on their first word, so
  -- "University of Leeds" was skipped once "Heriot-Watt University" existed.
  if not exists (
    select 1 from jsonb_array_elements(coalesce(doc->'education', '[]'::jsonb)) e
    where e->>'school' ilike '%Leeds%' or e->>'degree' ilike '%Leeds%'
  ) then
    doc := jsonb_set(doc, '{education}', coalesce(doc->'education', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'degree', 'Master of Science, Environmental Engineering and Project Management (with Distinction)',
      'school', 'University of Leeds', 'logo', '', 'location', 'United Kingdom', 'dates', '2008', 'bullets', '[]'::jsonb)));
  end if;

  update public.pf_profiles set content = doc where user_id = owner;
  raise notice 'Owner research moved to the Research section.';
end;
$$;
