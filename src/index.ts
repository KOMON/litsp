/**** Type Helpers ****/
type Flatten<T, Prev extends any[] = []> = 
  T extends [] 
    ? Prev
  : T extends [infer X, ...infer Xs] 
    ? X extends any[]
      ? Flatten<[...X, ...Xs], Prev>
    : Flatten<Xs, [...Prev, X]>
  : T;

/******* Warning! *******/
/**
 * These next two types, `UnionToIntersection` and `UnionToTuple` are known to
 * be bad and wrong in often suprising situations, use at your own risk!
 */
type UnionToIntersection<T> = (T extends never ? never : (arg: T) => never
) extends (arg: infer I) => void
  ? I
  : never

type UnionToTuple<T> = UnionToIntersection<
 T extends never ? never : (t: T) => T
> extends (_: never) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : []

/**** ALists ****/
type AListEntry<Key extends string, T> = [Key, T];
type AList<Entries extends AListEntry<string, any>[]> = Entries;

type AListKeys<A> =
  A extends []
    ? []
  : A extends [AListEntry<infer Key, any>, ...infer Entries]
    ? [Key, ...AListKeys<Entries>]
  : never;

type AListValues<A> =
  A extends []
    ? []
  : A extends [AListEntry<any, infer Value>, ...infer Entries]
    ? [Value, ...AListValues<Entries>]
  : never;

type AListRemove<A extends AList<any[]>, Target extends string> =
  A extends []
    ? []
  : A extends [AListEntry<infer Key, any>, ...infer Entries]
    ? Key extends Target
      ? AListRemove<Entries, Target>
    : [__Head<A>, ...AListRemove<Entries, Target>]
  : never;

type AListUnique<A extends AList<any[]>> =
  A extends []
    ? []
  : A extends [AListEntry<infer Key, any>, ...infer Entries]
    ? [__Head<A>, AListUnique<AListRemove<Entries, Key>>]
  : never;

type AListToDict<A extends AList<any[]>> =
   A extends []
    ? {}
  : A extends [AListEntry<infer Key, infer Value>, ...infer Entries]
    ? {[K in Key]: Value} & AListToDict<Entries>
  : never;

type AListLookup<Key extends string, A extends AList<any[]>> =
  A extends []
    ? never
  : A extends [AListEntry<infer K, infer Value>, ...infer Entries]
    ? K extends Key
      ? Value
    : AListLookup<Key, Entries>
  : never;

type ArgsToParams<Params, Args extends AListValues<Params>> =
  Params extends []
    ? []
  : Args extends []
    ? never
  : Params extends [AListEntry<infer Key, any>, ...infer RestP]
    ? Args extends [infer Value, ...infer RestA]
      ? RestA extends AListValues<RestP>
        ? [AListEntry<Key, Value>, ...ArgsToParams<RestP, RestA>]
      : never
    : never
  : never;

/**** Type Functions ****/
interface Callable<Params> {
  params: Params;
  input: unknown;
  args: unknown;
  body: unknown;
  result: unknown;
}

type Apply<C extends Callable<any>, Args> = (C & { input: Args})['result'];

interface Fn<Params extends any[]> extends Callable<Params> {
  args: this['input'] extends this['params'] ? this['input'] : never;
  result: this['args'] extends this['params'] ? this['body'] : never;
}

interface LetFn<Params extends AList<any[]>> extends Callable<AListValues<Params>> {
  args: this['input'] extends AListValues<Params>
    ? AListToDict<ArgsToParams<Params, this['input']>>
    : never;
  result: this['args'] extends AListToDict<Params> ? this['body'] : never;
}

/**** Utility Functions ****/

interface Identity extends LetFn<[['x', any]]> {
  body: this['args']['x'];
}

interface ParamsOf extends LetFn<[['f', Callable<any>]]> {
  body: this['args']['f'] extends Callable<[...(infer Params)]> ? Params : never;
}

interface ParamAtOf extends LetFn<[['f', Callable<any[]>], ['idx', number]]> {
  paramsOf: Apply<ParamsOf, [this['args']['f']]>;
  body: this['paramsOf'][this['args']['idx']];
}

interface ExcludeTuple extends LetFn<[['a', any[]], ['b', any[]]]> {
  body: this['args']['a'] extends []
    ? []
  : this['args']['a'] extends [infer _, ...infer Xs]
    ? this['args']['b'] extends [infer _, ...infer Ys]
      ? Apply<ExcludeTuple, [Xs, Ys]>
    : this['args']['a']
  : never;
}

interface __Curry<
  C extends Callable<any[]>,
  Args extends any[]
> extends Fn<Apply<ExcludeTuple, [Apply<ParamsOf, [C]>, Args]>> {
  body: Apply<C, [...Args, ...this['args']]>
}

interface Curry extends LetFn<[['c', Callable<any>], ['args', any[]]]> {
  body: __Curry<this['args']['c'], this['args']['args']>
}

interface __Flip<
  C extends Callable<[any, any]>
> extends Fn<[Apply<ParamAtOf, [C, 1]>, Apply<ParamAtOf, [C, 0]>]> {
  body: Apply<C, [this['args'][1], this['args'][0]]>;
}

interface Flip extends Fn<[['c', Callable<[any, any]>]]> {
  body: __Flip<this['args']['c']>;
}

interface FnMap extends Fn<[['c', Callable<[any]>], ['l', any[]]]> {
  paramType: Apply<ParamAtOf, [this['args']['c'], 0]>;
  body:
    this['args']['l'] extends this['paramType'][]
    ? this['args']['l'] extends []
      ? []
    : this['args']['l'] extends [infer X, ...infer Xs]
      ? [Apply<this['args']['c'], [X]>, ...Apply<FnMap, [this['args']['l'], Xs]>]
    : never
  : never;
}

interface FoldL extends Fn<[['c', Callable<[any, any]>], ['acc', any], ['l', any[]]]> {
  accType: Apply<ParamAtOf, [this['args']['c'], 0]>;
  valType: Apply<ParamAtOf, [this['args']['acc'], 1]>[];
  body:
    this['args']['acc'] extends this['accType']
      ? this['args']['l'] extends this['valType'][]
        ? this['args']['l'] extends []
          ? []
        : this['args']['l'] extends [infer X, ...infer Xs]
          ? Apply<
              FoldL, [
                this['args']['c'], 
                Apply<this['args']['c'], [this['args']['acc'], X]>,
                Xs
              ]
            >
        : never
      : never
    : never;
}

interface FoldR extends Fn<[['c', Callable<[any, any]>], ['acc', any], ['l', any[]]]> {
  accType: Apply<ParamAtOf, [this['args']['c'], 0]>;
  valType: Apply<ParamAtOf, [this['args']['acc'], 1]>[];
  body:
    this['args']['acc'] extends this['accType']
      ? this['args']['l'] extends this['valType'][]
        ? this['args']['l'] extends []
          ? []
        : this['args']['l'] extends [...infer Xs, infer X]
          ? Apply<
              FoldR, [
                this['args']['c'],
                Apply<this['args']['c'], [this['args']['acc'], X]>,
                Xs
              ]
            >
          : never
        : never
    : never;
}

type Peano<X extends number, T extends any[] = []> = 
  T extends { length: X } ? T : Peano<X, [...T, any]>;

type __Add<A extends number, B extends number> =
  [...Peano<A>, ...Peano<B>]['length'];

type __Subtract<A extends number, B extends number> =
  Peano<A> extends [...infer U, ...Peano<B>]
    ? U['length']
  : never;

interface Add extends LetFn<[['x', number], ['y', number]]> {
  body: __Add<this['args']['x'], this['args']['y']>
}

interface Subtract extends LetFn<[['x', number], ['y', number]]> {
  body: __Subtract<this['args']['x'], this['args']['y']>
}

interface Incr extends LetFn<[['x', number]]> {
  body: __Add<this['args']['x'], 1>;
}

interface Decr extends LetFn<[['x', number]]> {
  body: __Subtract<this['args']['x'], 1>;
}

/**** Lisp ****/
type __Sym<S extends string> = `$${S}`;

type __Cons<X, Y> = Y extends any[] ? [X, ...Y] : [X, Y];
interface Cons extends LetFn<[['x', any], ['y', any]]> {
  body: __Cons<this['args']['x'], this['args']['y']>;
}

type __Head<A> = A extends [infer X, ...infer _] ? X : [];
interface Head extends LetFn<[['l', any[]]]> {
  body: __Head<this['args']['l']>;
}

type __Tail<A> = A extends [infer _, ...infer Xs] ? Xs : [];
interface Tail extends LetFn<[['l', any[]]]> {
  body: __Tail<this['args']['l']>;
}

type __Atom<T> = T extends Record<any, any> ? false : T extends any[] ? false : true;
interface Atom extends Fn<[any]> {
  body: __Atom<this['args'][0]>;
}

type __List<T> = T extends any[] ? true : false;
interface List extends Fn<[any]> {
  body: __List<this['args'][0]>;
}

type __Quote<T> = [Quote, T];

type __Eq<A, B> = A extends B ? B extends A ? true : false : false;
interface Eq extends LetFn<[['a', any], ['b', any]]> {
  body: __Eq<this['args']['a'], this['args']['b']>;
}

type __And<A, B> = A extends true ? B extends true ? true : false : false;
interface And extends LetFn<[['a', boolean], ['b', boolean]]> {
  body: __And<this['args']['a'], this['args']['b']>;
}

type __Or<A, B> = A extends true ? true : B extends true ? true : false;
interface Or extends LetFn<[['a', boolean], ['b', boolean]]> {
  body: __Or<this['args']['a'], this['args']['b']>;
}

type __Not<A> = A extends true ? false : true;
interface Not extends LetFn<[['a', boolean]]> {
  body: __Not<this['args']['a']>;
}

type Substitute<S extends __Sym<any>, Env extends AList<any[]>> =
  S extends __Sym<infer Key>
    ? AListLookup<Key, Env> extends infer Lookup
      ? Lookup extends never
        ? S
      : Lookup
    : never
  : never;

type Sym = __Sym<string>;
type Cond = __Sym<'Cond'>;
type Lambda = __Sym<'Lambda'>;
type Define = __Sym<'Define'>;
type Defun = __Sym<'Define'>;
type Quote = __Sym<'Quote'>;

type __Program<Forms, Env extends AList<any[]> = [], LastValue extends any = undefined> =
  Forms extends []
    ? [LastValue, Env]
  : __Head<Forms> extends [Define, __Sym<infer Name>, infer Body]
    ? __Program<__Tail<Forms>, [[Name, Eval<Body, Env>], ...Env], LastValue>
  : __Head<Forms> extends [Defun, __Sym<infer Name>, infer Params, infer Body]
    ? Params extends AList<any[]>
      ? __Program<
          __Tail<Forms>,
          [
            [
              Name,
              __Lambda<
                DesymAList<Params>, 
                Body, 
                [[Name, [Lambda, DesymAList<Params>, Body]], ...Env]
              >
            ],
            ...Env
          ],
        LastValue
      >
    : never
  : __Program<__Tail<Forms>, Env, Eval<__Head<Forms>, Env>>;

type Program<Forms, Env extends AList<any[]> = []> =
  __Program<Forms, Env> extends [infer Value, any]
    ? Value
  : never;

type Eval<Body, Env extends AList<any[]> = []> =
  __Atom<Body> extends true
    ? Body extends __Sym<string>
      ? Substitute<Body, Env>
    : Body
  : Body extends __Quote<infer Value>
    ? Value
  : __Head<Body> extends Callable<any>
    ? Apply<__Head<Body>, EvalList<__Tail<Body>, Env>>
  : __Head<Body> extends Cond
    ? EvalCond<__Tail<Body>, Env>
  : __Head<Body> extends __Sym<string>
    ? Eval<[Eval<__Head<Body>, Env>, ...__Tail<Body>], Env>
  : Body extends [[Lambda, ...any[]], ...infer Args]
     ? Eval<
         [
           EvalLambda<__Head<Body>, Env>,
           ...Args,
         ],
         Env
       >
   : never;

type EvalLambda<Body, Env extends AList<any[]> = []> =
  Body extends [Lambda, infer Params, infer Body]
    ? Params extends AList<any[]>
      ? __Lambda<Params, Body, Env>
    : never
  : never;

type DesymAList<A> =
  A extends []
   ? []
 : A extends [infer Head, ...infer Tail]
   ? Head extends [__Sym<infer Name>, infer Value]
     ? [[Name, Value], ...DesymAList<Tail>]
   : [Head, ...DesymAList<Tail>]
 : never;

interface __Lambda<Params extends AList<any[]>, Body, Env extends AList<any[]>> extends Callable<AListValues<Params>> {
  evaluatedInput: EvalList<this['input'], Env>,
  args: this['evaluatedInput'] extends AListValues<Params> ? ArgsToParams<Params, this['evaluatedInput']> : never;
  bodyForm: Body;
  env: Env,
  body: Eval<this['bodyForm'], [...this['args'], ...this['env']]>
  result: this['args'] extends Params ? this['body'] : never;
}

type EvalCond<Body, Env extends AList<any[]>> =
  Body extends []
    ? never
  : Body extends [[infer P, infer  Then], ...infer Rest]
    ? Eval<P, Env> extends true
      ? Eval<Then, Env>
    : EvalCond<Rest, Env>
  : never;

type EvalList<Body, Env extends AList<any[]>> =
  Body extends []
    ? []
  : [Eval<__Head<Body>, Env>, ...EvalList<__Tail<Body>, Env>];
