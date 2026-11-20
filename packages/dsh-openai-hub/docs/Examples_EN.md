# Examples in DSH

## Two-account model list

Suppose two accounts are labeled `work` and `personal`. Their models appear under the single provider group `OpenAI Hub`, for example `work/gpt-6.2-sol` and `personal/gpt-6-astra`. Each account has a separate information block and model settings modal. A request for `work/gpt-6.2-sol` resolves the `work` credential and sends `gpt-6.2-sol` to the upstream API.

## Add an account

1. Open Settings -> Models and choose Add account.
2. Enter a unique lowercase ASCII label before OAuth.
3. Complete the displayed ChatGPT authorization flow.
4. Review the account's models and refresh the catalog if needed.

The catalog is fetched through the authenticated API. If refreshing fails, the last successful catalog remains available; before the first successful fetch the local catalog is used with an error indication.

## Quotas

Quota auto-refresh is off by default for each account. Enable it only where desired. It normally polls every five minutes; the currently selected account/model polls every minute when its nearest applicable remaining limit is below 25%. Polling pauses while the DSH page is hidden and resumes with one refresh when visible. The chat status bar shows the selected account's quota only for an OpenAI Hub model.

See [Installation and acceptance](Setup_EN.md) for the migration and manual validation checklist.
