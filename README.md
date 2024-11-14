# liTSp

A Lisp-like DSL for Typescript types, here's a sample:

```typescript
type P = [
  [Define, '$hi', 1],
  [Defun, '$incr/1', [['$x', number]],
     [Incr, '$x']],
  [Defun, '$decr/1', [['$x', number]],
     [Decr, '$x']],
  [Defun, '$and/2', [['$x', boolean], ['$y', boolean]],
    [Cond,
      [[And, '$x', '$y'], true],
       [true, false]]],
  [Defun, '$incr/2', [['$x', number], ['$y', number]],
    [Cond,
      [[Eq, '$y', 0], '$x'],
      [true, ['$incr/2', ['$incr/1', '$x'], ['$decr/1', '$y']]]]],
  [Defun, '$add/2', [['$x', number], ['$y', number]],
    [Add, '$x', '$y']],
  [Cons, '$hi', [Quote, [1, 2, 3]]]
];

type ZZ = Program<P>;
```

Almost certainly buggy, verifiably slow

Seriously, you should _not_ use this in production. You will be fired.

## TODO

- [ ] Go write a blog post about this
- [ ] Go re-implement some of the utility functions in the DSL
- [ ] Experiment more with creative use of string syntax
- [ ] Standardize some notion of Macros-as-types
