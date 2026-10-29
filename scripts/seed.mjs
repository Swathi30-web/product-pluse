// Regenerates db.json with demo data:  npm run seed
import fs from 'fs';
const day = (n) => new Date(Date.now() - n * 864e5).toISOString();
const keys = ['users','workspaces','workspaceMembers','categories','tags','feedback','votes','comments','roadmapItems','releaseNotes','subscriptionPlans','workspaceSubscriptions','activityLogs'];
const db = Object.fromEntries(keys.map((k) => [k, []]));
const add = (k, o) => { o.id = db[k].length + 1; db[k].push(o); return o.id; };

['Alex Morgan:alex@acme.com','Priya Shah:priya@acme.com','Sam Lee:sam@acme.com','Jordan Blake:jordan@customer.com','Taylor Reed:taylor@customer.com','Riley Chen:riley@customer.com']
  .forEach((s) => { const [name, email] = s.split(':'); add('users', { name, email, password: 'demo123' }); });

add('workspaces', { name: 'Acme Cloud', slug: 'acme-cloud', description: 'Feedback hub for the Acme Cloud platform.', logoUrl: '', brandColor: '#4f46e5', publicRoadmap: true, createdAt: day(90) });
add('workspaces', { name: 'Nova Analytics', slug: 'nova-analytics', description: 'Roadmap and ideas for Nova Analytics.', logoUrl: '', brandColor: '#059669', publicRoadmap: true, createdAt: day(40) });

[[1,1,'owner','active'],[1,2,'admin','active'],[1,3,'pm','active'],[1,4,'customer','active'],[1,5,'customer','active'],[1,6,'customer','invited'],
 [2,2,'owner','active'],[2,1,'admin','active'],[2,4,'customer','active']]
  .forEach(([workspaceId, userId, role, status]) => add('workspaceMembers', { workspaceId, userId, role, status }));

db.subscriptionPlans.push({ id: 'free', name: 'Free', price: 0, maxMembers: 5, maxFeedback: 10, maxRoadmap: 5 });
db.subscriptionPlans.push({ id: 'pro', name: 'Pro', price: 29, maxMembers: 50, maxFeedback: 500, maxRoadmap: 100 });
add('workspaceSubscriptions', { workspaceId: 1, planId: 'pro' });
add('workspaceSubscriptions', { workspaceId: 2, planId: 'free' });

['Integrations:#6366f1','Reporting:#0ea5e9','UX:#ec4899','Performance:#f59e0b','Security:#ef4444'].forEach((s) => { const [name, color] = s.split(':'); add('categories', { workspaceId: 1, name, color }); });
['Dashboards:#10b981','Data Sources:#3b82f6','Alerts:#f97316'].forEach((s) => { const [name, color] = s.split(':'); add('categories', { workspaceId: 2, name, color }); });
['api','mobile','quick-win','enterprise','accessibility'].forEach((name) => add('tags', { workspaceId: 1, name }));
['ux','sql','export'].forEach((name) => add('tags', { workspaceId: 2, name }));

// [ws, title, description, categoryId, tagIds, submitter, priority, status, duplicateOf, daysAgo]
const fb = [
 [1,'Slack integration for notifications','Send alerts and status changes to a Slack channel so the whole team sees them.',1,[1,3],4,'high','planned',null,60],
 [1,'Scheduled PDF reports','We need weekly PDF reports emailed to stakeholders automatically.',2,[4],5,'high','in_progress',null,55],
 [1,'Dark mode','A dark theme would help during long working sessions.',3,[5,3],4,'medium','under_review',null,50],
 [1,'Faster dashboard load times','The main dashboard takes over 6 seconds to load with large datasets.',4,[],5,'critical','in_progress',null,45],
 [1,'Single sign-on (SAML)','Enterprise customers require SAML SSO to adopt the product.',5,[4],6,'high','planned',null,40],
 [1,'Mobile app','Native mobile app for iOS and Android to review data on the go.',3,[2],4,'medium','open',null,35],
 [1,'Slack alerts please','Would love to get notifications inside Slack.',1,[1],5,'medium','open',1,30],
 [1,'Public REST API','Expose a documented public API for custom integrations.',1,[1,4],4,'high','completed',null,28],
 [1,'Export reports to CSV','Allow exporting any report table as CSV.',2,[3],5,'low','completed',null,25],
 [1,'Keyboard navigation','Full keyboard accessibility for forms and menus.',3,[5],6,'medium','open',null,15],
 [1,'Audit log export','Admins need to export the audit log for compliance reviews.',5,[4],4,'medium','under_review',null,10],
 [1,'Bulk edit feedback','Select multiple items and change status at once.',3,[3],5,'low','declined',null,5],
 [2,'Drag-and-drop dashboard builder','Let users arrange widgets freely.',1,[1],4,'high','planned',null,30],
 [2,'Connect PostgreSQL directly','Native PostgreSQL connector.',2,[2],4,'critical','in_progress',null,28],
 [2,'Email alert thresholds','Configure thresholds that trigger email alerts.',3,[],4,'medium','open',null,26],
 [2,'Export charts as PNG','Download any chart as an image.',1,[3],4,'low','completed',null,24],
 [2,'Dashboard builder with drag drop','Same as drag-and-drop widgets request.',1,[1],4,'medium','open',13,20],
 [2,'Saved filters','Persist my filters between sessions.',1,[1],4,'medium','open',null,15],
 [2,'Dark chart palette','Color-blind-friendly palette.',1,[1],4,'low','open',null,12],
 [2,'Query history','See previous SQL queries.',2,[2],4,'medium','under_review',null,9],
].forEach(([workspaceId, title, description, categoryId, tagIds, submitterId, priority, status, duplicateOf, d]) =>
  add('feedback', { workspaceId, title, description, categoryId, tagIds, submitterId, priority, status, duplicateOf, createdAt: day(d) }));

const voters = { 1: [1,2,3,4,5], 2: [2,1,4] };
db.feedback.forEach((f) => voters[f.workspaceId].forEach((u, i) => { if ((f.id + i * 3) % 3 !== 0) add('votes', { workspaceId: f.workspaceId, feedbackId: f.id, userId: u }); }));
[[1,1,4,'This would save us hours every week.'],[1,2,2,'Scoping this with the team now.'],[1,4,3,'Profiling started, root cause is the aggregation query.'],[1,5,6,'Our security team needs this before rollout.'],[2,13,1,'Great idea, planned for next quarter.']]
  .forEach(([workspaceId, feedbackId, userId, body], i) => add('comments', { workspaceId, feedbackId, userId, body, createdAt: day(10 - i) }));

[[1,'Slack integration','Post updates to Slack channels.','planned',[1,7],true,20],
 [1,'Scheduled reports','Weekly PDF reports by email.','in_progress',[2],true,18],
 [1,'Dashboard performance','Query caching and lazy loading.','in_progress',[4],true,17],
 [1,'SAML SSO','Enterprise single sign-on.','under_review',[5],true,15],
 [1,'Public API v1','REST API with API keys.','completed',[8],true,40],
 [1,'CSV export','Export tables as CSV.','completed',[9],true,30],
 [1,'Internal admin tooling','Not ready to publish yet.','under_review',[],false,5],
 [2,'Dashboard builder','Drag-and-drop widgets.','planned',[13,17],true,10],
 [2,'PostgreSQL connector','Native connector.','in_progress',[14],true,9],
 [2,'PNG chart export','Export charts as image.','completed',[16],true,8],
].forEach(([workspaceId, title, description, stage, feedbackIds, published, d]) => add('roadmapItems', { workspaceId, title, description, stage, feedbackIds, published, createdAt: day(d) }));

add('releaseNotes', { workspaceId: 1, version: '1.2.0', title: 'Public API & CSV export', releaseDate: day(25).slice(0,10), summary: 'Introducing the public REST API and CSV export for every report.', roadmapItemIds: [5,6], status: 'published' });
add('releaseNotes', { workspaceId: 1, version: '1.3.0', title: 'Scheduled reports', releaseDate: day(-7).slice(0,10), summary: 'Upcoming release with scheduled PDF reports.', roadmapItemIds: [], status: 'draft' });
add('releaseNotes', { workspaceId: 1, version: '1.0.0', title: 'Initial launch', releaseDate: day(90).slice(0,10), summary: 'First public release of Acme Cloud.', roadmapItemIds: [], status: 'archived' });
add('releaseNotes', { workspaceId: 2, version: '0.5.0', title: 'Chart export', releaseDate: day(8).slice(0,10), summary: 'Export charts as PNG images.', roadmapItemIds: [10], status: 'published' });

[[1,1,'created workspace'],[1,4,'submitted feedback "Slack integration for notifications"'],[1,3,'moved "Scheduled reports" to In Progress'],[2,2,'created workspace']]
  .forEach(([workspaceId, userId, action], i) => add('activityLogs', { workspaceId, userId, action, createdAt: day(20 - i * 4) }));

fs.writeFileSync(new URL('../db.json', import.meta.url), JSON.stringify(db, null, 2));
console.log('db.json generated');
