-- Phase 8A: seed the item catalogue.
--
-- Dimensions are real-world plausible values for UK domestic furniture, not
-- placeholders — they're what the pricing engine turns into volume, and what
-- vehicle matching will eventually size a van against. `volume_m3` is the
-- raw bounding box (L x W x H / 1,000,000) rounded to 3dp; it deliberately
-- does NOT include a packing/air-gap allowance, because the pricing engine
-- applies its own loading-efficiency factor once, centrally, rather than
-- baking a fudge into every row here.
--
-- Weights are typical, not maxima. They're informational for now (the
-- pricing engine prices on volume, since van capacity binds before payload
-- for domestic removals) but are captured so payload-based vehicle matching
-- can use them later without a re-seed.
--
-- `search_terms` are typeahead synonyms — regional/colloquial names and
-- common misspellings, so "settee" finds a sofa and "telly" finds a TV.

insert into item_catalogue (name, category, length_cm, width_cm, height_cm, volume_m3, weight_kg, search_terms, sort_order) values

-- Sofas -----------------------------------------------------------------
('Two Seater Sofa',           'sofas', 160, 90, 85, 1.224, 45, array['settee','couch','loveseat','2 seater','two seat sofa'], 10),
('Three Seater Sofa',         'sofas', 210, 90, 85, 1.607, 60, array['settee','couch','3 seater','three seat sofa'], 20),
('Four Seater Sofa',          'sofas', 260, 95, 85, 2.100, 75, array['settee','couch','4 seater','large sofa'], 30),
('L Shaped Sofa',             'sofas', 260, 200, 85, 4.420, 95, array['corner sofa','chaise','l shape','sectional'], 40),
('Two Seater Reclining Sofa', 'sofas', 175, 95, 100, 1.663, 70, array['recliner','reclining settee','2 seater recliner'], 50),
('Three Seater Reclining Sofa','sofas', 220, 95, 100, 2.090, 90, array['recliner','reclining settee','3 seater recliner'], 60),
('Two Seater Sofa Bed',       'sofas', 170, 95, 85, 1.373, 65, array['sofabed','pull out sofa','futon','2 seater sofa bed'], 70),
('Three Seater Sofa Bed',     'sofas', 215, 95, 85, 1.736, 85, array['sofabed','pull out sofa','3 seater sofa bed'], 80),
('Corner Sofa Bed',           'sofas', 265, 205, 85, 4.617, 110, array['corner sofabed','l shaped sofa bed'], 90),

-- Wardrobes -------------------------------------------------------------
('Single Wardrobe',           'wardrobes', 90, 60, 200, 1.080, 45, array['1 door wardrobe','closet','single closet'], 10),
('Double Wardrobe',           'wardrobes', 120, 60, 200, 1.440, 65, array['2 door wardrobe','closet','double closet'], 20),
('Triple Wardrobe',           'wardrobes', 180, 60, 200, 2.160, 95, array['3 door wardrobe','triple closet'], 30),
('Flat Packed Wardrobe',      'wardrobes', 200, 65, 25, 0.325, 55, array['flatpack wardrobe','dismantled wardrobe','flat pack'], 40),
('Chest Of Drawers',          'wardrobes', 90, 45, 100, 0.405, 35, array['drawers','dresser','tallboy','chest'], 50),
('Bookcase',                  'wardrobes', 90, 30, 180, 0.486, 30, array['book shelf','bookshelf','shelving unit'], 60),
('Shelf',                     'wardrobes', 90, 25, 20, 0.045, 6, array['shelving','wall shelf','single shelf'], 70),

-- Boxes & Bags ----------------------------------------------------------
('Large Box',                 'boxes_bags', 50, 50, 50, 0.125, 18, array['big box','large carton','tea chest'], 10),
('Medium Box',                'boxes_bags', 45, 45, 35, 0.071, 13, array['standard box','medium carton'], 20),
('Small Box',                 'boxes_bags', 40, 30, 30, 0.036, 9, array['book box','small carton'], 30),
('Large Bag',                 'boxes_bags', 70, 40, 40, 0.112, 12, array['big bag','laundry bag','ikea bag','holdall'], 40),
('Small Bag',                 'boxes_bags', 45, 30, 30, 0.041, 7, array['carrier bag','duffel','small holdall'], 50),
('Suitcase',                  'boxes_bags', 75, 50, 30, 0.113, 15, array['luggage','travel case','trolley case'], 60),
('Box Of Clothes',            'boxes_bags', 50, 50, 50, 0.125, 12, array['clothing box','wardrobe box','clothes carton'], 70),

-- Beds & Mattresses -----------------------------------------------------
('Single Bed & Mattress',     'beds_mattresses', 190, 90, 60, 1.026, 45, array['single divan','3ft bed','single bed set'], 10),
('Double Bed & Mattress',     'beds_mattresses', 190, 135, 60, 1.539, 70, array['double divan','4ft6 bed','double bed set'], 20),
('Kingsize Bed & Mattress',   'beds_mattresses', 200, 150, 60, 1.800, 85, array['king divan','5ft bed','king size bed set'], 30),
('Single Bed Frame',          'beds_mattresses', 190, 90, 30, 0.513, 25, array['single bedstead','3ft frame','dismantled single bed'], 40),
('Double Bed Frame',          'beds_mattresses', 190, 135, 30, 0.770, 40, array['double bedstead','4ft6 frame','dismantled double bed'], 50),
('Kingsize Bed Frame',        'beds_mattresses', 200, 150, 30, 0.900, 50, array['king bedstead','5ft frame'], 60),
('Bunk Bed',                  'beds_mattresses', 200, 100, 165, 3.300, 75, array['bunks','childrens bunk','double bunk'], 70),
('Sofa Bed',                  'beds_mattresses', 200, 95, 85, 1.615, 80, array['sofabed','pull out bed','futon'], 80),
('Single Mattress',           'beds_mattresses', 190, 90, 25, 0.428, 20, array['3ft mattress','single matress'], 90),
('Double Mattress',           'beds_mattresses', 190, 135, 28, 0.718, 30, array['4ft6 mattress','double matress'], 100),
('Kingsize Mattress',         'beds_mattresses', 200, 150, 30, 0.900, 40, array['king mattress','5ft mattress'], 110),

-- Tables ----------------------------------------------------------------
('Coffee Table',              'tables', 110, 60, 45, 0.297, 18, array['low table','lounge table','side table'], 10),
('4 Seater Dining Table',     'tables', 120, 80, 75, 0.720, 30, array['dining table','kitchen table','4 seat table'], 20),
('6 Seater Dining Table',     'tables', 180, 90, 75, 1.215, 45, array['dining table','large dining table','6 seat table'], 30),
('4 Seater Dining Table & Chairs','tables', 120, 80, 100, 0.960, 60, array['dining set','table and chairs','4 seat dining set'], 40),
('6 Seater Dining Table & Chairs','tables', 180, 90, 100, 1.620, 85, array['dining set','table and chairs','6 seat dining set'], 50),
('Office Desk',               'tables', 140, 70, 75, 0.735, 35, array['work desk','computer desk','writing desk'], 60),
('Small Desk',                'tables', 100, 50, 75, 0.375, 20, array['study desk','compact desk','laptop desk'], 70),
('Bedside Table',             'tables', 45, 40, 55, 0.099, 10, array['nightstand','bedside cabinet','night table'], 80),
('Dressing Table',            'tables', 110, 45, 145, 0.718, 35, array['vanity table','vanity unit','makeup table'], 90),
('Garden Table',              'tables', 150, 90, 75, 1.013, 30, array['patio table','outdoor table','picnic table'], 100),

-- Televisions -----------------------------------------------------------
('Large TV (over 40")',       'televisions', 125, 12, 78, 0.117, 20, array['telly','big tv','55 inch tv','65 inch tv','flat screen'], 10),
('Medium TV (30-40")',        'televisions', 92, 10, 58, 0.053, 12, array['telly','32 inch tv','40 inch tv','flat screen'], 20),
('Small TV (under 30")',      'televisions', 65, 10, 42, 0.027, 7, array['telly','24 inch tv','portable tv','bedroom tv'], 30),
('TV Stand',                  'televisions', 120, 40, 50, 0.240, 25, array['tv unit','media unit','television stand'], 40),

-- Appliances ------------------------------------------------------------
('Fridge',                    'appliances', 60, 60, 145, 0.522, 55, array['refrigerator','under counter fridge','larder fridge'], 10),
('Fridge Freezer',            'appliances', 60, 65, 185, 0.722, 80, array['american fridge','tall fridge freezer','freezer'], 20),
('Washing Machine',           'appliances', 60, 60, 85, 0.306, 70, array['washer','washing mashine','laundry machine'], 30),
('Tumble Dryer',              'appliances', 60, 60, 85, 0.306, 50, array['dryer','tumbledryer','clothes dryer'], 40),

-- Chairs ----------------------------------------------------------------
('Armchair',                  'chairs', 90, 85, 90, 0.689, 30, array['easy chair','lounge chair','tub chair'], 10),
('Sofa Chair',                'chairs', 100, 90, 90, 0.810, 35, array['single seater sofa','one seater','snuggle chair'], 20),
('Office Chair',              'chairs', 65, 65, 115, 0.486, 15, array['desk chair','swivel chair','task chair'], 30),
('Dining Chair',              'chairs', 45, 50, 95, 0.214, 6, array['kitchen chair','table chair'], 40),
('Desk Chair',                'chairs', 55, 55, 100, 0.303, 10, array['study chair','computer chair'], 50),
('Garden Chair',              'chairs', 55, 60, 90, 0.297, 6, array['patio chair','outdoor chair','deck chair'], 60),
('Folding Chair',             'chairs', 45, 6, 90, 0.024, 4, array['fold up chair','stacking chair','spare chair'], 70),
('Rocking Chair',             'chairs', 70, 95, 105, 0.698, 18, array['rocker','nursing chair'], 80);
