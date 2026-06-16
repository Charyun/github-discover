-- Seed data for OpenHub. 8 industries, 25 scenes.
-- Run with: psql "$DATABASE_URL" -f scripts/seed.sql

INSERT INTO industries (id, name_zh, name_en, icon, sort_order) VALUES
  ('life',        '生活消费', 'Life & Consumer',   '🏠', 1),
  ('productivity','职场效率', 'Productivity',      '💼', 2),
  ('content',     '内容创作', 'Content Creation',  '🎨', 3),
  ('business',    '小微经营', 'Small Business',    '🏪', 4),
  ('education',   '学习教育', 'Education',         '📚', 5),
  ('health',      '健康医疗', 'Health & Medical',  '🏥', 6),
  ('smarthome',   '智能家居', 'Smart Home',        '🏡', 7),
  ('gaming',      '游戏娱乐', 'Gaming',            '🎮', 8)
ON CONFLICT (id) DO NOTHING;

INSERT INTO scenes (id, industry_id, name_zh) VALUES
  ('life-home',     'life',        '家居装修'),
  ('life-food',     'life',        '餐饮美食'),
  ('life-travel',   'life',        '旅行出行'),
  ('prod-pm',       'productivity','项目管理'),
  ('prod-docs',     'productivity','文档知识'),
  ('prod-auto',     'productivity','自动化办公'),
  ('content-video', 'content',     '视频制作'),
  ('content-design','content',     '平面设计'),
  ('content-audio', 'content',     '播客音频'),
  ('content-write', 'content',     '写作出版'),
  ('biz-ecom',      'business',    '电商开店'),
  ('biz-crm',       'business',    '客户管理'),
  ('biz-finance',   'business',    '财务管理'),
  ('edu-lang',      'education',   '语言学习'),
  ('edu-code',      'education',   '编程入门'),
  ('edu-km',        'education',   '知识管理'),
  ('health-fit',    'health',      '运动健身'),
  ('health-mental', 'health',      '心理健康'),
  ('health-chronic','health',      '慢病管理'),
  ('home-auto',     'smarthome',   '家庭自动化'),
  ('home-security', 'smarthome',   '安全监控'),
  ('home-energy',   'smarthome',   '能源管理'),
  ('game-dev',      'gaming',      '游戏开发'),
  ('game-sim',      'gaming',      '模拟经营'),
  ('game-retro',    'gaming',      '怀旧复古')
ON CONFLICT (id) DO NOTHING;
