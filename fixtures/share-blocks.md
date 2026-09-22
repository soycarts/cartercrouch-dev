# Block boundaries — a fixture for the diff's splitter

This fixture exists for one test: that the diff's idea of a block never
straddles a boundary the renderer itself draws. Every construct below was
taken from a document the share site actually carries.

A setext heading
----------------

And one with the other underline
================================

## Lists, the awkward ones

- A plain bullet
- A bullet whose paragraph carries on
  onto a second, properly indented line
  - A nested bullet
    with its own continuation
- A bullet with a second paragraph in it

  The second paragraph, indented to the content column.

1. An ordered item
2) An ordered item with the other delimiter
10. An item whose marker is two digits wide

Timour:
* Sign-off on the definitions
Seref:
* Thresholds

## A table indented inside a list item

- The item that owns it:

  | Bridge table | From → to | Typical source |
  |---|---|---|
  | `intention_versions` | intention → intention | a refinement |
  | `outcome_links` | outcome → intention | a verification |

## A table that follows a paragraph with no blank line between

The paragraph that introduces it:
| Column | Meaning |
|---|---|
| one | the first |
| two | the second |

## Tab-indented numbering, as an export produces it

	1. Started the experiment by asking whether personal agents could expand agency.
	2. Could expanding people's capacity to act weaken their autonomy?
	3. An internal forum was created in which agents deliberated.

## Fences and quotes

```ts
// A fence containing something that looks like Markdown:
// ## not a heading
// - not a bullet
const x = 1;
```

~~~
A tilde fence, closed by tildes.
~~~

> A quote,
> carried over two lines.

> A second quote, after a blank line.

---

<div class="raw">Raw HTML, which the renderer drops entirely.</div>

<!-- A comment, likewise. -->

A last paragraph, so the file does not end on a dropped block.
