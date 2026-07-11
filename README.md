# text-analytics-explorer
## Background
Text Analytics is increasingly commoditized. LLMs for all put a world with TA everywhere within reach. While traditionally for customer experience/experience management, TA could be applied to any text at all.
## Why
Most data - and an increasing proportion of new data and sources - is textual and unstructured. TA exists to give that data structure. Given better structure, an organization can perform analytics and strategic tasks like reviewing the terms and conditions associated with a plane ticket’s purchase and operational tasks like directly reaching out to customers that have been negatively impacted by the fine print in the terms and conditions.
## What it does (high level)
-Given text, extract topics and themes
—Text is bound by a single document. It can range from a few characters (in the case of a tweet) to thousands characters (in the case of a transcribed phone call)
—Topics describe a bucket of data and categorize the text into those buckets. Topics are durable and can be thought of as the columns a TA system is trying to sort text into. Topics can be multiple levels deep. Topics are more what, concerned with what the text is about
—-Customers are able to seed their own topics
—Themes are lighter weight than topics - and fleeting. If a theme manifests frequently enough, then it might be “promoted” to a topic. Themes cannot be multiple levels deep. Themes are more why/how, concerned with the underlying messages, sentiment, or patterns of meaning
—-Give the user an opportunity to confirm/deny the promotion of a theme to a topic
-Given multiple sets of text, try to reconcile/de-dupe topics and themes where possible
—Multiple sets of text describe multiple documents
—Reconcile/de-dupe refers to merging similar concepts on the basic of semantics
—Give the user an opportunity to confirm/deny the attempted merge
-With topics and themes, a user is able to run simple reports on the counts of a topic or theme occurring. These counts accumulate across batches
### Data model
-Topics and themes are bound by a project 
—A project can take many shapes, but it is usually bound by a set of sources that accrue to 1+ use cases 
—An individual account or brand could have multiple projects
—Topics and themes can occur in multiple projects but there is no connection between the assets in each project. For a user to have the same topics and themes across projects, they need to upload the same documents and/or create the topics and themes in both projects
-Documents are unique per project. There needs to be a unique key per document
—Customers can provide unique identifiers of their own, but we need to reserve our own uniqueness because duplicates will cause major issues 
—Uploading a document twice, if it is identical, blocks the subsequent upload. If it is different, it replaces the previous upload
### User stories
As a topic admin,
I need to be able to upload documents and receive recommended topics and themes,
So that I can quickly create text analytics assets.

As a topic admin with known unknowns, 
I need to be able to create a topic ontology manually,
So that I don’t need to rely on the AI.

As a topic admin,
I need periodic recommended topics and theme identification,
So that my model stays fresh with the data.

As a topic admin,
I need to be able to confirm or deny theme promotion to topics,
So that my model stays fresh. 

As a topic admin,
I need to be able to confirm or deny theme and topic creation,
So that the system does not spin out of my control.

As a topic admin,
I need to be able to update the names of topics and themes,
So that the topics fit the naming conventions my organization has in place and remain cogent.

As a topic admin, 
I need to be able to merge or deny topic and themes creation,
So that the system does not take an action I disagree with. 

As a topic admin,
I need to be able to see the past 30 days of denied theme promotions, topic and theme creations, and merges,
So that I can distinguish between the work done (denied) and the work to do (pending).

As a topic admin, 
I should not see semantically similar themes identified as those in my denial queue,
So that I am not inundated with repeats.

As a topic admin, 
I need to be able to see the past 90 days of pending theme promotions, topic and theme creations, and merges,
So that I prioritize the TA work to be done.

As a topic admin,
I need to be able to specify conservative, balanced, and aggressive, per project, wrt detection, promotion, and merging,
So that I can be more confident or aggressive when something surfaces.

As a topic admin,
I need to be able to undeny accidental denials,
So that those items are moved back to pending and I can undo mistakes I or other admins made.
## Status
IN PROGRESS
### Futures
-insight mining
-basic aggregation options like an ability to create trends on some sort of date field
—If a document doesn’t have a date, then the upload date would need to be used
-An ability to create some statistical measures like averages and medians to aggregate by those dates would be useful for understanding if an issue is truly one off or the beginning of a trend
-an ability to schedule, crawl, or poll data sources so that uploads aren’t all manual
