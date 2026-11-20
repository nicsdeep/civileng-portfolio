-- One-off content update requested by the portfolio owner (Edmund Rwigyikiiza):
-- add his research proposal to his portfolio and fill in résumé items that are
-- missing. The owner asked for this to be done for him and accepted that the
-- proposal text is stored in this (public) repository.
--
-- * Finds the owner's portfolio by its first address, "3453-caribou-crescent"
--   (current address, or the address history after the 2026-11-17 move).
-- * Adds the research proposal as the first, featured project (replacing an
--   earlier copy with the same title, so re-running is harmless).
-- * Adds education, certifications, experience and skills from the résumé only
--   where nothing similar exists. Nothing is deleted. Street address, phone and
--   licence number are not added. Visibility (published) is not changed.
-- * If the portfolio is not found (for example in CI or a fresh database), it
--   does nothing.

do $$
declare
  owner uuid;
  doc jsonb;
  research jsonb;
  item jsonb;
  added text[] := '{}';
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
    raise notice 'Owner has no portfolio row; nothing to update.';
    return;
  end if;

  -- Research proposal, from "Research Title - Condensed New Outline".
  research := jsonb_build_object(
    'title', 'Integrated Artificial Intelligence and Digital Twin Modeling for Resilient and Optimized Infrastructure Planning in the Arctic Region',
    'subtitle', 'Research proposal · Northern Canada',
    'description',
      'Critical infrastructure in Northern Canada faces permafrost degradation, extreme cold, freeze–thaw cycles, flooding, remoteness, short construction seasons and limited resources, which raise lifecycle costs and complicate planning. '
      || 'Aim: to develop an integrated Artificial Intelligence and Digital Twin modeling framework for resilient and optimized infrastructure planning in the Arctic region, capable of predicting infrastructure performance and deterioration, evaluating climate-related risks and interdependencies, and supporting cost-effective, sustainable and resilient decisions under uncertain future conditions. '
      || 'Objectives: (1) an integrated AI–Digital Twin framework combining BIM, GIS, asset, sensor, remote-sensing and climate data; (2) AI models that predict deterioration, maintenance needs and failures under Arctic climate hazards; (3) integration of climate risks, infrastructure interdependencies, cascading impacts and resilience assessment; (4) a validated multi-objective AI decision-support framework optimizing cost, risk, performance, resilience and sustainability using Northern Canadian case studies. '
      || 'Method, in seven stages: data acquisition; Digital Twin development; AI prediction (deterioration, remaining useful life, failure probability, disruption); climate and resilience modeling; multi-objective optimization of maintenance, adaptation and investment strategies; validation with Northern Canadian case studies incorporating stakeholder and Indigenous knowledge; and an integrated decision-support platform. '
      || 'Significance: a shift from reactive, asset-specific planning to predictive, integrated and data-driven infrastructure management, supporting municipalities, infrastructure agencies, Indigenous communities and policymakers.',
    'image', '',
    'tech', jsonb_build_array('Artificial Intelligence', 'Digital Twin', 'BIM', 'GIS', 'Climate resilience', 'Multi-objective optimization', 'Asset management', 'Arctic infrastructure'),
    'links', '[]'::jsonb,
    'featured', true
  );

  doc := jsonb_set(doc, '{projects}',
    jsonb_build_array(research) || coalesce(
      (select jsonb_agg(p) from jsonb_array_elements(coalesce(doc->'projects', '[]'::jsonb)) p
        where p->>'title' is distinct from research->>'title'),
      '[]'::jsonb));
  added := array_append(added, 'research project');

  -- Education (added only when that school is not listed yet).
  for item in select * from jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('degree', 'Master of Science, Petroleum Engineering', 'school', 'Heriot-Watt University', 'logo', '', 'location', 'United Kingdom', 'dates', '2012', 'bullets', '[]'::jsonb),
    jsonb_build_object('degree', 'Master of Science, Environmental Engineering and Project Management (with Distinction)', 'school', 'University of Leeds', 'logo', '', 'location', 'United Kingdom', 'dates', '2008', 'bullets', '[]'::jsonb),
    jsonb_build_object('degree', 'Postgraduate Diploma, Project Planning and Management', 'school', 'Uganda Management Institute', 'logo', '', 'location', 'Uganda', 'dates', '2007', 'bullets', '[]'::jsonb),
    jsonb_build_object('degree', 'Bachelor of Science, Mechanical Engineering', 'school', 'Makerere University', 'logo', '', 'location', 'Uganda', 'dates', '2001', 'bullets', '[]'::jsonb)
  )) loop
    if not exists (
      select 1 from jsonb_array_elements(coalesce(doc->'education', '[]'::jsonb)) e
      where e->>'school' ilike '%' || split_part(item->>'school', ' ', 1) || '%'
         or e->>'degree' ilike '%' || split_part(item->>'school', ' ', 1) || '%'
    ) then
      doc := jsonb_set(doc, '{education}', coalesce(doc->'education', '[]'::jsonb) || jsonb_build_array(item));
      added := array_append(added, ('education: ' || (item->>'school')));
    end if;
  end loop;

  -- Certifications and memberships (matched on a distinctive word).
  for item in select * from jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('name', 'P.Eng (Professional Engineer)', 'issuer', 'Professional Engineers Ontario', 'date', '', 'url', '', 'match', 'P\.?\s?Eng'),
    jsonb_build_object('name', 'PMP (Project Management Professional)', 'issuer', 'Project Management Institute', 'date', '', 'url', '', 'match', '\mPMP\M'),
    jsonb_build_object('name', 'Public-Private-Partnerships Specialist', 'issuer', '', 'date', '', 'url', '', 'match', 'Public.Private'),
    jsonb_build_object('name', 'Member, International Water Association (IWA)', 'issuer', 'International Water Association', 'date', '', 'url', '', 'match', '\mIWA\M|International Water Association'),
    jsonb_build_object('name', 'Member, Society of Petroleum Engineers (SPE)', 'issuer', 'Society of Petroleum Engineers', 'date', '', 'url', '', 'match', '\mSPE\M|Society of Petroleum')
  )) loop
    if not exists (
      select 1 from jsonb_array_elements(coalesce(doc->'certifications', '[]'::jsonb)) c
      where (c->>'name') ~* (item->>'match')
    ) then
      doc := jsonb_set(doc, '{certifications}', coalesce(doc->'certifications', '[]'::jsonb) || jsonb_build_array(item - 'match'));
      added := array_append(added, ('certification: ' || (item->>'name')));
    end if;
  end loop;

  -- Experience (added only when that employer and role are not listed yet).
  for item in select * from jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('role', 'Engineer, Guidelines and Standards', 'org', 'City of Ottawa, Infrastructure and Water Services', 'logo', '', 'location', 'Ottawa, ON', 'start', '', 'end', '', 'match_org', 'Ottawa', 'match_role', '',
      'bullets', jsonb_build_array(
        'Develop, review and update engineering guidelines, design standards, specifications and technical manuals for municipal infrastructure.',
        'Align standards with provincial regulations, national codes and municipal policies, integrating sustainability and climate resilience.',
        'Advise design teams and consultants on municipal buildings, roads, water distribution, wastewater collection and the ROPEC treatment plant.',
        'Support construction, QA/QC and asset management so standards reflect lifecycle costing, durability and maintainability.')),
    jsonb_build_object('role', 'Senior Municipal Planning Engineer/Officer', 'org', 'Government of Nunavut, Department of Transportation and Infrastructure', 'logo', '', 'location', 'Nunavut', 'start', '2024', 'end', 'Dec 2025', 'match_org', 'Nunavut', 'match_role', '',
      'bullets', jsonb_build_array(
        'Capital infrastructure planning for all Nunavut municipalities: water and wastewater treatment, solid waste, roads, reclamation sites and airport upgrades.',
        'Lead project manager for water, wastewater and solid waste portfolios worth over $70 million across the Territory.',
        'Solid waste upgrade design for nine municipalities, including second-generation landfills, leachate management and composting.',
        'Capital investment planning through risk assessment, safety evaluation, service level analysis and asset management.')),
    jsonb_build_object('role', 'Senior Engineer', 'org', 'Ministry of Water and Environment, Uganda', 'logo', '', 'location', 'Uganda', 'start', '2009', 'end', '2022', 'match_org', 'Water and Environment', 'match_role', 'Senior',
      'bullets', jsonb_build_array(
        'Technical oversight and compliance monitoring of water supply and sanitation projects from initiation to close-out.',
        'Review and approval of designs for water treatment plants, distribution networks and sewerage systems.',
        'Utility performance monitoring and KPIs; support for national water policy, licensing, guidelines and tariff frameworks.',
        'Feasibility studies, investment plan review, asset management and long-term capital investment planning.')),
    jsonb_build_object('role', 'Project Engineer', 'org', 'Ministry of Water and Environment, Uganda', 'logo', '', 'location', 'Uganda', 'start', 'Feb 2002', 'end', 'Jul 2009', 'match_org', 'Water and Environment', 'match_role', 'Project Engineer',
      'bullets', '[]'::jsonb)
  )) loop
    if not exists (
      select 1 from jsonb_array_elements(coalesce(doc->'experience', '[]'::jsonb)) x
      where x->>'org' ilike '%' || (item->>'match_org') || '%'
        and (item->>'match_role' = '' or x->>'role' ilike '%' || (item->>'match_role') || '%')
    ) then
      doc := jsonb_set(doc, '{experience}', coalesce(doc->'experience', '[]'::jsonb) || jsonb_build_array(item - 'match_org' - 'match_role'));
      added := array_append(added, ('experience: ' || (item->>'role')));
    end if;
  end loop;

  -- Skills, only if the portfolio has none.
  if jsonb_array_length(coalesce(doc->'skills', '[]'::jsonb)) = 0 then
    doc := jsonb_set(doc, '{skills}', jsonb_build_array(
      jsonb_build_object('group', 'Technical', 'items', jsonb_build_array('Infrastructure planning and design', 'Municipal facilities', 'Asset management')),
      jsonb_build_object('group', 'Project management', 'items', jsonb_build_array('Capital budgeting and resource management', 'Quality control and assurance', 'Contract administration')),
      jsonb_build_object('group', 'Software', 'items', jsonb_build_array('AutoCAD', 'GIS', 'MS Project')),
      jsonb_build_object('group', 'Regulatory knowledge', 'items', jsonb_build_array('Municipal, provincial and federal regulations', 'Environmental regulations', 'Building codes and standards', 'Zoning and land-use planning')),
      jsonb_build_object('group', 'Communication', 'items', jsonb_build_array('Technical writing and reports', 'Public speaking and presentation', 'Stakeholder engagement')),
      jsonb_build_object('group', 'Field experience', 'items', jsonb_build_array('Site inspection and assessment', 'Construction supervision', 'Data collection and analysis'))));
    added := array_append(added, 'skills');
  end if;

  update public.pf_profiles set content = doc where user_id = owner;
  raise notice 'Owner portfolio updated: %', array_to_string(added, '; ');
end;
$$;
