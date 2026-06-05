# Changelog

## [1.4.0](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/compare/agent-issue-tracker-v1.3.0...agent-issue-tracker-v1.4.0) (2026-06-05)


### Features

* activity page now correctly shows status updates ([1740e8f](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/1740e8f8a0f2e48defe501362bd952a824f21f49))
* add blockIssue endpoint and API routing support ([94798e2](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/94798e21717c87ea58cf4463fadfd2be5e9031b4))
* add issue_status_history for audit log ([c9bcd5c](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/c9bcd5ccc27dcaf36ee25a3850250872cc04e037))
* add issue_status_history for audit log ([cc8e50b](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/cc8e50ba26c3f688b97da15a7ffe7b67c3dea464))
* add issue-helpers.js with tokenLevel, filterIssues, and countByStatus ([c40ce5a](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/c40ce5ae07f5e89da7ca50bb481f95238158605d))
* add status-specific color classes for audit log dots ([894d6c0](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/894d6c086a11d25dedb851b97de5c599bbcb91dd))
* added a checker during the runner that finds all in_progress issues that have crashed/failed, and unblocks them to be reran or reviewed by human on frontend ([b9038e6](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/b9038e6fd1144218671b5f508fc710cc98054194))
* added blockIssue ([a958afe](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/a958afe64793b9ec290f89592b7c997e534ce11a))
* added created_by_user column for the issue database ([a4f9118](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/a4f9118522b23973993f28b2d9169012be7e6208))
* added setup page with local storage ([9c3427d](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/9c3427d549a6f2bd31494ee44a51196e04ccc99f))
* **api-tests:** expand coverage for GET, POST, and partial PUT issue flows ([4b66b87](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/4b66b87725506ff3083323b7398ca5a1ee86d85c))
* **api-tests:** expand coverage for GET, POST, and partial PUT issue flows ([7452f01](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/7452f01c30fc432299790b003ade47ee60ac3fc8))
* **api:** add claim, complete handlers and agent simulator ([66003cc](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/66003cc288c4d7f78c16a772269a87ea208c4b9e))
* **api:** add PUT request handler ([9b2d9be](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/9b2d9bed69b3ace32abac2981ab61ec9e3f3fc4a))
* **api:** update api contract and simulator ([8da6aa7](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/8da6aa7f7ff9c75a780a5489a0b32c5f5a8528e1))
* **api:** update api contract and simulator to match team 1 ([540d587](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/540d587a6a4f01299096f121e68025e4d9ade23f))
* **auth:** add login and register endpoint with D1 user lookup ([21dd6c3](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/21dd6c39db5eef6f94a53f442eb946a54904363e))
* **auth:** add login and register endpoint with D1 user lookup ([8eac6e8](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/8eac6e86774c752c26059566da429dae6bbc8472))
* **auth:** change user ID format to user-XXXXX with zero-padded random number ([d58e5fb](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/d58e5fb4655bf05f7439bbbeacb2ea5f0fd8b9f4))
* clean up async calls, remove dead nav links, removed stale code ([67f0f89](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/67f0f89fd90cd7d97b8e438325ca0f49ffc55452))
* complete audit log frontend for issue [#49](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/issues/49) (relates [#49](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/issues/49)) ([d3f8977](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/d3f8977c6e9cb9b16f8487122028373a114153b4))
* create dashboard frontend (doesn't have JS integrations yet) ([0b678bc](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/0b678bcb3782ef863dfd332857f979f3b594a340))
* dark theme support, cleaned up a bunch of css ([504c5f6](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/504c5f6d0c75afe7c07824b58533ab51a27cd871))
* dark theme support, cleaned up a bunch of css ([31513d4](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/31513d4bd0762669bf34672b59ea1005a74e07e7))
* dashboard activity feed + more components ([252794f](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/252794f3426a5866d8f42fb8bddb1b2623a4a9d0))
* Dashboard frontend, navbar and sidebar frontend, import SVG and font assets. ([86034fe](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/86034fe456e1be5d163365a812d0cfe197873e56))
* description is now editable with clear indication for users ([6617fba](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/6617fba4552ff5cf18f764cafccf8ab54a480e57))
* **frontend:** dashboard integrates with issue backend ([a45de54](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/a45de54f8827f5b440b86ba5d0be302ce9f39c61))
* **frontend:** dashboard integrates with issue backend ([29eee06](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/29eee0623b85995475a1de06992002feb17b98bf))
* implement PUT endpoint for issues ([6ca152e](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/6ca152edaadf8bf2b2338583ecb68a9fa22333f3))
* implemented CRUD functions and jsdocs ([8d58b22](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/8d58b22404391f991212030fb2203605ff1b4665))
* implemented logout function ([f9ce175](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/f9ce175bb92608f719bca0171b417c860b8e761e))
* **issues:** filter GET /api/issues by logged-in user ([ded5b9a](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/ded5b9aad934d1498375ad312b96476bb29f550c))
* **issues:** filter GET /api/issues by logged-in user and add auth endpoint ([9181032](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/9181032e03ba1dd70f20b743f2489a47eadd7d4e))
* major overhaul + user login for per-user issues ([2756334](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/275633497fa5112cb954e3ab1763da5055ff271d))
* navbar and sidebar setup, initialized standard CSS values ([74b1c99](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/74b1c992d5a57d80a564240f7301e0939df6df76))
* runner.js script ([500c5fc](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/500c5fcc50719d369038cf1c11c4f00e0ce904f2))
* **runner:** add Claude API integration with quality checks and tests ([754d879](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/754d87953e1c7ef4cf6f390adbabe655a0af7deb))
* **schema:** add blocked status to issue_status field ([a7d10fa](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/a7d10faebb29e99eb8465aaaca88c90c9a9ebdd6))
* simplified README and made more accurate for easy workflow ([85d7d62](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/85d7d620600c4d3c62ac78601ec837864ab30ae0))
* test of showing settings modal WIP ([ed81451](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/ed81451e93f305669c3927f138cc8b8eacfeaa4c))
* theme toggle in settings, removed outdated login modal ([a99f5c3](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/a99f5c3b0d01247552f0836fc56fc5f6547ee70f))
* unified navbar and sidebar components, sidebar toggling ([df1e04c](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/df1e04c2aadd66d67483909903f9e9d64d7eaaf0))
* users can now find their ait_user_id in the frontend in settings page. Can easily copy and paste into .env ([222689c](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/222689c10ae2d6bf81e3366cfaed80553fe4e095))
* wire issue list to Cloudflare API via data.js (new js files) ([85faff6](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/85faff6edeba64b4856b3b7c1d7f915431f8742e))


### Bug Fixes

* Agents now inject their ID so server doesn't error during issue claiming ([dce7896](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/dce78963a909c1c21361b77846af6eebfd1b5c63))
* audit log assignee showing agent correctly ([fcb2eeb](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/fcb2eebd0fce89d8c91949a90e60ec7bd8d6c711))
* changed api endpoint for get all issues ([e769ba8](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/e769ba88ccae49d871fd79dacdff913c4ac1cbd4))
* Claim issue and edit issue no longer errors during PUT/POST ([5b16060](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/5b16060c5e0923389f9546f90691d40e504a4d06))
* claim logic for agents ([7e948d7](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/7e948d7131f987b9e7623b58c2676455bbeb66c6))
* cleaned up stale files and filxed sql migration query ([b6f3480](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/b6f3480fce072cadd9ee4311f53f18131bb4a8b2))
* **cors:** added headers to api responses to fix cors issues ([71d9484](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/71d948486fd0c81abadc1211fc3ddca6b4402818))
* **cors:** added headers to api responses to fix cors issues ([64128a8](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/64128a84caee7564ccb222fec1db07baac8717d4))
* Creating subsequent issues no longer errors due to FK constraint ([d5fac52](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/d5fac52dec31118ee6dd7ad65529214efb0a5ac0))
* DB now accepts agent name to prevent server 500 error when claiming issues ([69e0ce5](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/69e0ce583d05f3119590931fad61de6b42b21307))
* DB now has agent_status ([ec03cb5](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/ec03cb5a26461bcabf4dd9519f7955448dc622fc))
* **docs:** fix formatting in status flow diagram ([92d8f29](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/92d8f2973f75a8a25cd31053bbe28b9b7fff9493))
* **docs:** update issue_status options in api contract ([bf63a82](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/bf63a8224f0fcec539fbb2a701bb432840ddbb09))
* eslint quotes, add jsdoc, and swap blocked and pending review columns ([c9bb8e9](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/c9bb8e98b41c200a4f95b3999b08a64dd33c13be))
* **expiration, test:** fixed tests based on new bool ([4303664](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/430366487a485ed2865e9bc2b1c0bb9c8d7798a1))
* fixed list rendering "no issues" text incorrectly ([0d60379](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/0d6037962015eb6a5799960120d3826b02486bed))
* fixed themes not saving correctly ([59893af](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/59893affe4b24407a61452afbc18acfd7ac00153))
* fixed worker.test.js to comply with the update for getAllIssues ([5cfd515](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/5cfd515ecab2b7b6331d6e48e942286219cf43d2))
* **frontend:** dashboard and issues page use the same status icons ([0c7ae25](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/0c7ae25ae9f4135558b6cb34f31aa1eee3498cfa))
* **frontend:** Fixed dark/light theme, activity page shows all status updates ([5d15bd9](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/5d15bd9efecdf628ab3a9509ea69d07ecb7f120c))
* **frontend:** removed sidebar, fixed order of issue columns, renamed "dashboard" to "activity" ([c8de4a9](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/c8de4a9a4b4b70969e16984ac4a68a85fef80fdf))
* **frontend:** removed sidebar, renamed "dashboard" to "activity", fixed order of issue columns ([24c583f](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/24c583fe963be132cd42f55f49634603253d6941))
* **frontend:** swapped no issues text label from pending to blocked column ([4ef0b0f](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/4ef0b0f1a4de687bcd411e2d8b8978f1bdae2180))
* **issue assignment:** converted assignments to booleans, solo-dev only ([e85f664](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/e85f664d5713bc1ed5805ac58691232f74d026fd))
* **issue assignment:** converted assignments to booleans, solo-dev only ([c3004b3](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/c3004b31307c322c2641d8c0d21139b330b94195))
* **issue id assignment:** use a global uuid for issue ids; display ids are globally sequential ([8ac1af2](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/8ac1af2e6f70361efc0e58bb997c60a2f13daf74))
* lint errors ([4b7755a](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/4b7755a7b14abab2413d3d01f034f864d684666f))
* made P1 color amber to make it distinct from P0 color red ([07b2ccc](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/07b2ccc86c5dee66bc6ab879858257444970ef3a))
* make the scope of display_no increments to be per user instead of globally ([b61c6bf](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/b61c6bf0a83540871487d2fe577cbde7eb199ce0))
* make the scope of display_no increments to be per user instead of globally ([960eb01](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/960eb01b0c634963122c6d76df0e0d622f73bd18))
* Null agent name in DB ([5372a27](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/5372a2783deb9db81413029e77f5b2f2bbe588b0))
* package-lock.json dotenv-cli ([4dcd8eb](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/4dcd8eb255d2d04f36e1bc80646160176ed85445))
* re-add svg icons ([511542e](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/511542eb0aa7fa414d363ce29b4a69a910a48fe3))
* README is now more clear for ait setup ([b6d5631](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/b6d5631974f4a04ca37062cafe99b245a84e2ad7))
* regenerate package-lock.json to resolve missing @emnapi/core dependency ([d306151](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/d30615146b95c565b63e18f3c39492caf2a6afaf))
* removed test user ID ([df40247](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/df40247fbafd741031783280c33ee3c9764f0a19))
* resolve eslint errors and add missing JSDoc annotations ([b5798ba](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/b5798ba7270607c9b9d79663a47f4cf1958a4713))
* resolved an eslint problem ([72883ff](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/72883ff86dee17384afe019fd85f6ec6a52fb7ef))
* sidebar updates when you click on the tabs/toggle ([a979ecc](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/a979ecc9f618b63648bd34807c88568d5f206701))
* **simulator:** update agent simulator ([e9bfebf](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/e9bfebf49dd3018425f996cb61ef5f973478c3ca))
* **simulator:** update agent simulator ([8c02ea4](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/8c02ea4ba5cf9871ee6997bbfbff4743522394a4))
* strengthened wording in runner to make Claude work on issue ([0ae00a0](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/0ae00a0cdefc9b557df0e6fa157b4d778db26123))
* **tests:** update import paths after moving tests to src/tests ([2f73b7e](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/2f73b7ef4d37629d4817e9ee6f4ef30d790683bf))
* update handler logic for API routing ([0feed71](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/0feed7124b7bc6a936ccbdf855f835a85934460a))

## [1.3.0](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/compare/v1.2.0...v1.3.0) (2026-06-02)


### Features

* users can now find their ait_user_id in the frontend in settings page. Can easily copy and paste into .env ([222689c](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/222689c10ae2d6bf81e3366cfaed80553fe4e095))


### Bug Fixes

* **issue id assignment:** use a global uuid for issue ids; display ids are globally sequential ([8ac1af2](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/8ac1af2e6f70361efc0e58bb997c60a2f13daf74))

## [1.2.0](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/compare/v1.1.0...v1.2.0) (2026-06-01)


### Features

* added a checker during the runner that finds all in_progress issues that have crashed/failed, and unblocks them to be reran or reviewed by human on frontend ([b9038e6](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/b9038e6fd1144218671b5f508fc710cc98054194))
* added created_by_user column for the issue database ([a4f9118](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/a4f9118522b23973993f28b2d9169012be7e6208))
* **auth:** add login and register endpoint with D1 user lookup ([21dd6c3](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/21dd6c39db5eef6f94a53f442eb946a54904363e))
* **auth:** add login and register endpoint with D1 user lookup ([8eac6e8](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/8eac6e86774c752c26059566da429dae6bbc8472))
* **auth:** change user ID format to user-XXXXX with zero-padded random number ([d58e5fb](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/d58e5fb4655bf05f7439bbbeacb2ea5f0fd8b9f4))
* **issues:** filter GET /api/issues by logged-in user ([ded5b9a](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/ded5b9aad934d1498375ad312b96476bb29f550c))
* **issues:** filter GET /api/issues by logged-in user and add auth endpoint ([9181032](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/9181032e03ba1dd70f20b743f2489a47eadd7d4e))
* major overhaul + user login for per-user issues ([2756334](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/275633497fa5112cb954e3ab1763da5055ff271d))
* **runner:** add Claude API integration with quality checks and tests ([754d879](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/754d87953e1c7ef4cf6f390adbabe655a0af7deb))


### Bug Fixes

* changed api endpoint for get all issues ([e769ba8](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/e769ba88ccae49d871fd79dacdff913c4ac1cbd4))
* cleaned up stale files and filxed sql migration query ([b6f3480](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/b6f3480fce072cadd9ee4311f53f18131bb4a8b2))
* fixed worker.test.js to comply with the update for getAllIssues ([5cfd515](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/5cfd515ecab2b7b6331d6e48e942286219cf43d2))
* regenerate package-lock.json to resolve missing @emnapi/core dependency ([d306151](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/d30615146b95c565b63e18f3c39492caf2a6afaf))
* resolve eslint errors and add missing JSDoc annotations ([b5798ba](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/b5798ba7270607c9b9d79663a47f4cf1958a4713))
* **tests:** update import paths after moving tests to src/tests ([2f73b7e](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/2f73b7ef4d37629d4817e9ee6f4ef30d790683bf))

## [1.1.0](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/compare/v1.0.0...v1.1.0) (2026-05-28)


### Features

* add blockIssue endpoint and API routing support ([94798e2](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/94798e21717c87ea58cf4463fadfd2be5e9031b4))
* add issue_status_history for audit log ([c9bcd5c](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/c9bcd5ccc27dcaf36ee25a3850250872cc04e037))
* add issue_status_history for audit log ([cc8e50b](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/cc8e50ba26c3f688b97da15a7ffe7b67c3dea464))

## 1.0.0 (2026-05-27)


### Features

* **api-tests:** expand coverage for GET, POST, and partial PUT issue flows ([4b66b87](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/4b66b87725506ff3083323b7398ca5a1ee86d85c))
* **api-tests:** expand coverage for GET, POST, and partial PUT issue flows ([7452f01](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/7452f01c30fc432299790b003ade47ee60ac3fc8))
* **api:** add claim, complete handlers and agent simulator ([66003cc](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/66003cc288c4d7f78c16a772269a87ea208c4b9e))
* **api:** add PUT request handler ([9b2d9be](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/9b2d9bed69b3ace32abac2981ab61ec9e3f3fc4a))
* **api:** update api contract and simulator ([8da6aa7](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/8da6aa7f7ff9c75a780a5489a0b32c5f5a8528e1))
* **api:** update api contract and simulator to match team 1 ([540d587](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/540d587a6a4f01299096f121e68025e4d9ade23f))
* clean up async calls, remove dead nav links, removed stale code ([67f0f89](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/67f0f89fd90cd7d97b8e438325ca0f49ffc55452))
* create dashboard frontend (doesn't have JS integrations yet) ([0b678bc](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/0b678bcb3782ef863dfd332857f979f3b594a340))
* dashboard activity feed + more components ([252794f](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/252794f3426a5866d8f42fb8bddb1b2623a4a9d0))
* Dashboard frontend, navbar and sidebar frontend, import SVG and font assets. ([86034fe](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/86034fe456e1be5d163365a812d0cfe197873e56))
* **frontend:** dashboard integrates with issue backend ([a45de54](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/a45de54f8827f5b440b86ba5d0be302ce9f39c61))
* **frontend:** dashboard integrates with issue backend ([29eee06](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/29eee0623b85995475a1de06992002feb17b98bf))
* implement PUT endpoint for issues ([6ca152e](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/6ca152edaadf8bf2b2338583ecb68a9fa22333f3))
* implemented CRUD functions and jsdocs ([8d58b22](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/8d58b22404391f991212030fb2203605ff1b4665))
* navbar and sidebar setup, initialized standard CSS values ([74b1c99](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/74b1c992d5a57d80a564240f7301e0939df6df76))
* **schema:** add blocked status to issue_status field ([a7d10fa](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/a7d10faebb29e99eb8465aaaca88c90c9a9ebdd6))
* unified navbar and sidebar components, sidebar toggling ([df1e04c](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/df1e04c2aadd66d67483909903f9e9d64d7eaaf0))
* wire issue list to Cloudflare API via data.js (new js files) ([85faff6](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/85faff6edeba64b4856b3b7c1d7f915431f8742e))


### Bug Fixes

* **cors:** added headers to api responses to fix cors issues ([71d9484](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/71d948486fd0c81abadc1211fc3ddca6b4402818))
* **cors:** added headers to api responses to fix cors issues ([64128a8](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/64128a84caee7564ccb222fec1db07baac8717d4))
* **docs:** fix formatting in status flow diagram ([92d8f29](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/92d8f2973f75a8a25cd31053bbe28b9b7fff9493))
* **docs:** update issue_status options in api contract ([bf63a82](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/bf63a8224f0fcec539fbb2a701bb432840ddbb09))
* eslint quotes, add jsdoc, and swap blocked and pending review columns ([c9bb8e9](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/c9bb8e98b41c200a4f95b3999b08a64dd33c13be))
* **frontend:** dashboard and issues page use the same status icons ([0c7ae25](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/0c7ae25ae9f4135558b6cb34f31aa1eee3498cfa))
* **frontend:** removed sidebar, fixed order of issue columns, renamed "dashboard" to "activity" ([c8de4a9](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/c8de4a9a4b4b70969e16984ac4a68a85fef80fdf))
* **frontend:** removed sidebar, renamed "dashboard" to "activity", fixed order of issue columns ([24c583f](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/24c583fe963be132cd42f55f49634603253d6941))
* **frontend:** swapped no issues text label from pending to blocked column ([4ef0b0f](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/4ef0b0f1a4de687bcd411e2d8b8978f1bdae2180))
* lint errors ([4b7755a](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/4b7755a7b14abab2413d3d01f034f864d684666f))
* package-lock.json dotenv-cli ([4dcd8eb](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/4dcd8eb255d2d04f36e1bc80646160176ed85445))
* re-add svg icons ([511542e](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/511542eb0aa7fa414d363ce29b4a69a910a48fe3))
* resolved an eslint problem ([72883ff](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/72883ff86dee17384afe019fd85f6ec6a52fb7ef))
* sidebar updates when you click on the tabs/toggle ([a979ecc](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/a979ecc9f618b63648bd34807c88568d5f206701))
* **simulator:** update agent simulator ([e9bfebf](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/e9bfebf49dd3018425f996cb61ef5f973478c3ca))
* **simulator:** update agent simulator ([8c02ea4](https://github.com/cse110-sp24-group05/Agent-Issue-Tracker/commit/8c02ea4ba5cf9871ee6997bbfbff4743522394a4))
