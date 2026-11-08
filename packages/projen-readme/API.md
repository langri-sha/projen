# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### ReadmeFile <a name="ReadmeFile" id="projen-readme.ReadmeFile"></a>

Initial `README` for new packages.

#### Initializers <a name="Initializers" id="projen-readme.ReadmeFile.Initializer"></a>

```typescript
import { ReadmeFile } from 'projen-readme'

new ReadmeFile(project: Project, options?: ReadmeFileOptions)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#projen-readme.ReadmeFile.Initializer.parameter.project">project</a></code> | <code>projen.Project</code> | *No description.* |
| <code><a href="#projen-readme.ReadmeFile.Initializer.parameter.options">options</a></code> | <code><a href="#projen-readme.ReadmeFileOptions">ReadmeFileOptions</a></code> | *No description.* |

---

##### `project`<sup>Required</sup> <a name="project" id="projen-readme.ReadmeFile.Initializer.parameter.project"></a>

- *Type:* projen.Project

---

##### `options`<sup>Optional</sup> <a name="options" id="projen-readme.ReadmeFile.Initializer.parameter.options"></a>

- *Type:* <a href="#projen-readme.ReadmeFileOptions">ReadmeFileOptions</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#projen-readme.ReadmeFile.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#projen-readme.ReadmeFile.with">with</a></code> | Applies one or more mixins to this construct. |
| <code><a href="#projen-readme.ReadmeFile.postProjectCreation">postProjectCreation</a></code> | Called once, right after `postSynthesize()`, only when the project is created for the first time. |
| <code><a href="#projen-readme.ReadmeFile.postSynthesize">postSynthesize</a></code> | Called after synthesis. |
| <code><a href="#projen-readme.ReadmeFile.preSynthesize">preSynthesize</a></code> | Called before synthesis. |
| <code><a href="#projen-readme.ReadmeFile.projectCreation">projectCreation</a></code> | Called once, right after `synthesize()`, only when the project is created for the first time. |
| <code><a href="#projen-readme.ReadmeFile.synthesize">synthesize</a></code> | Synthesizes files to the project output directory. |

---

##### `toString` <a name="toString" id="projen-readme.ReadmeFile.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `with` <a name="with" id="projen-readme.ReadmeFile.with"></a>

```typescript
public with(mixins: ...IMixin[]): IConstruct
```

Applies one or more mixins to this construct.

Mixins are applied in order. The list of constructs is captured at the
start of the call, so constructs added by a mixin will not be visited.
Use multiple `with()` calls if subsequent mixins should apply to added
constructs.

###### `mixins`<sup>Required</sup> <a name="mixins" id="projen-readme.ReadmeFile.with.parameter.mixins"></a>

- *Type:* ...constructs.IMixin[]

The mixins to apply.

---

##### `postProjectCreation` <a name="postProjectCreation" id="projen-readme.ReadmeFile.postProjectCreation"></a>

```typescript
public postProjectCreation(initProject: InitProject): void
```

Called once, right after `postSynthesize()`, only when the project is created for the first time.

It does not run on later `projen` invocations. It only fires for `projen new` (or `Projects.createProject`).
It is also skipped when post-synthesis steps are disabled, e.g. `--no-post` or `PROJEN_DISABLE_POST`.
Use it for one-off setup that can be turned off by the user, like running a task to give the user immediate
feedback on their new project. Order across components is not guaranteed.

###### `initProject`<sup>Required</sup> <a name="initProject" id="projen-readme.ReadmeFile.postProjectCreation.parameter.initProject"></a>

- *Type:* projen.InitProject

Details about how the project was created, e.g. its type and the original CLI args.

---

##### `postSynthesize` <a name="postSynthesize" id="projen-readme.ReadmeFile.postSynthesize"></a>

```typescript
public postSynthesize(): void
```

Called after synthesis.

Order is *not* guaranteed.

##### `preSynthesize` <a name="preSynthesize" id="projen-readme.ReadmeFile.preSynthesize"></a>

```typescript
public preSynthesize(): void
```

Called before synthesis.

##### `projectCreation` <a name="projectCreation" id="projen-readme.ReadmeFile.projectCreation"></a>

```typescript
public projectCreation(initProject: InitProject): void
```

Called once, right after `synthesize()`, only when the project is created for the first time.

It does not run on later `projen` invocations. It only fires for `projen new` (or `Projects.createProject`).
Use it for deterministic, one-off file generation. Order across components is not guaranteed.

###### `initProject`<sup>Required</sup> <a name="initProject" id="projen-readme.ReadmeFile.projectCreation.parameter.initProject"></a>

- *Type:* projen.InitProject

Details about how the project was created, e.g. its type and the original CLI args.

---

##### `synthesize` <a name="synthesize" id="projen-readme.ReadmeFile.synthesize"></a>

```typescript
public synthesize(): void
```

Synthesizes files to the project output directory.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#projen-readme.ReadmeFile.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |
| <code><a href="#projen-readme.ReadmeFile.isComponent">isComponent</a></code> | Test whether the given construct is a component. |

---

##### `isConstruct` <a name="isConstruct" id="projen-readme.ReadmeFile.isConstruct"></a>

```typescript
import { ReadmeFile } from 'projen-readme'

ReadmeFile.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="projen-readme.ReadmeFile.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

##### `isComponent` <a name="isComponent" id="projen-readme.ReadmeFile.isComponent"></a>

```typescript
import { ReadmeFile } from 'projen-readme'

ReadmeFile.isComponent(x: any)
```

Test whether the given construct is a component.

###### `x`<sup>Required</sup> <a name="x" id="projen-readme.ReadmeFile.isComponent.parameter.x"></a>

- *Type:* any

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#projen-readme.ReadmeFile.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#projen-readme.ReadmeFile.property.project">project</a></code> | <code>projen.Project</code> | *No description.* |

---

##### `node`<sup>Required</sup> <a name="node" id="projen-readme.ReadmeFile.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `project`<sup>Required</sup> <a name="project" id="projen-readme.ReadmeFile.property.project"></a>

```typescript
public readonly project: Project;
```

- *Type:* projen.Project

---


## Structs <a name="Structs" id="Structs"></a>

### ReadmeFileOptions <a name="ReadmeFileOptions" id="projen-readme.ReadmeFileOptions"></a>

Initial `README` for new packages.

#### Initializer <a name="Initializer" id="projen-readme.ReadmeFileOptions.Initializer"></a>

```typescript
import { ReadmeFileOptions } from 'projen-readme'

const readmeFileOptions: ReadmeFileOptions = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#projen-readme.ReadmeFileOptions.property.filename">filename</a></code> | <code>string</code> | *No description.* |

---

##### `filename`<sup>Optional</sup> <a name="filename" id="projen-readme.ReadmeFileOptions.property.filename"></a>

```typescript
public readonly filename: string;
```

- *Type:* string

---



