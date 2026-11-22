import type { ClassDef, Program } from './engine';

export interface Toggle { id: string; label: string; default: boolean; help: string }
export interface Scenario { id: string; title: string; goal: string; toggles: Toggle[]; build: (t: Record<string, boolean>) => Program }

const cls = (c: Partial<ClassDef> & { name: string }): ClassDef => ({ fields: [], methods: [], ctor: [], dtor: [], ...c });

export const SCENARIOS: Scenario[] = [
  { id: 'car', title: 'Class vs object: build a Car', goal: 'A class is a blueprint; each object has its own copy of the member variables. Watch speed change inside the object.', toggles: [],
    build: () => ({ classes: [cls({ name: 'Car', fields: [{ name: 'brand', type: 'string', init: 'Tesla', access: 'private' }, { name: 'speed', type: 'int', init: 0, access: 'private' }], methods: [{ name: 'accelerate', body: [{ k: 'add', field: 'speed', n: 10 }, { k: 'print', text: 'speed increased by 10' }] }] })],
      ops: [{ k: 'stack', v: 'myCar', cls: 'Car' }, { k: 'call', v: 'myCar', m: 'accelerate' }, { k: 'call', v: 'myCar', m: 'accelerate' }, { k: 'stack', v: 'yourCar', cls: 'Car' }, { k: 'call', v: 'yourCar', m: 'accelerate' }, { k: 'scopeEnd' }] }) },
  { id: 'inherit', title: 'Inheritance: Vehicle → Car', goal: 'A derived class contains its base class subobject and can call inherited functions.', toggles: [],
    build: () => ({ classes: [
      cls({ name: 'Vehicle', fields: [{ name: 'wheels', type: 'int', init: 4, access: 'public' }], methods: [{ name: 'start', body: [{ k: 'print', text: 'Vehicle engine starts' }] }] }),
      cls({ name: 'Car', base: 'Vehicle', fields: [{ name: 'doors', type: 'int', init: 4, access: 'public' }], methods: [{ name: 'honk', body: [{ k: 'print', text: 'Beep!' }] }] })],
      ops: [{ k: 'stack', v: 'c', cls: 'Car' }, { k: 'call', v: 'c', m: 'start' }, { k: 'call', v: 'c', m: 'honk' }, { k: 'scopeEnd' }] }) },
  { id: 'poly', title: 'Polymorphism: base pointer, derived objects', goal: 'Toggle `virtual` to see static vs dynamic dispatch, and the virtual destructor to see why it matters.',
    toggles: [{ id: 'virtualArea', label: 'virtual area()', default: true, help: 'Without virtual the base version always runs through a Shape*.' }, { id: 'virtualDtor', label: 'virtual ~Shape()', default: true, help: 'Without it, deleting through Shape* skips ~Circle (undefined behaviour).' }],
    build: t => ({ classes: [
      cls({ name: 'Shape', virtualDtor: t.virtualDtor, methods: [{ name: 'area', virtual: t.virtualArea, body: [{ k: 'print', text: 'Shape::area (generic)' }] }] }),
      cls({ name: 'Circle', base: 'Shape', fields: [{ name: 'r', type: 'int', init: 3, access: 'public' }], dtor: [{ k: 'print', text: 'releasing circle resources' }], methods: [{ name: 'area', override: t.virtualArea, body: [{ k: 'print', text: 'Circle::area = pi*r*r' }] }] }),
      cls({ name: 'Square', base: 'Shape', fields: [{ name: 's', type: 'int', init: 2, access: 'public' }], methods: [{ name: 'area', override: t.virtualArea, body: [{ k: 'print', text: 'Square::area = s*s' }] }] })],
      ops: [{ k: 'heap', v: 'p1', cls: 'Circle', as: 'Shape' }, { k: 'heap', v: 'p2', cls: 'Square', as: 'Shape' }, { k: 'call', v: 'p1', m: 'area' }, { k: 'call', v: 'p2', m: 'area' }, { k: 'delete', v: 'p1' }, { k: 'delete', v: 'p2' }] }) },
  { id: 'order', title: 'Constructors and destructors: order of events', goal: 'Bases and members are built first and destroyed last; destruction is the exact reverse of construction.', toggles: [{ id: 'virtualDtor', label: 'virtual ~Vehicle()', default: true, help: 'Affects only the heap object deleted through Vehicle*.' }],
    build: t => ({ classes: [
      cls({ name: 'Engine', ctor: [{ k: 'print', text: 'engine ready' }], dtor: [{ k: 'print', text: 'engine off' }] }),
      cls({ name: 'Vehicle', virtualDtor: t.virtualDtor, fields: [{ name: 'engine', type: 'Engine', access: 'private' }] }),
      cls({ name: 'Car', base: 'Vehicle', fields: [{ name: 'doors', type: 'int', init: 4, access: 'public' }] })],
      ops: [{ k: 'stack', v: 'a', cls: 'Car' }, { k: 'stack', v: 'b', cls: 'Car' }, { k: 'scopeEnd' }, { k: 'heap', v: 'p', cls: 'Car', as: 'Vehicle' }, { k: 'delete', v: 'p' }] }) },
  { id: 'copy', title: 'Copy, move, slicing and smart pointers (RAII)', goal: 'Copying creates an independent object, moving steals resources, slicing loses the derived part, smart pointers delete automatically.', toggles: [],
    build: () => ({ classes: [
      cls({ name: 'Resource', fields: [{ name: 'handle', type: 'int', init: 42, access: 'public' }], ctor: [{ k: 'print', text: 'resource acquired' }], dtor: [{ k: 'print', text: 'resource released' }] }),
      cls({ name: 'Base', fields: [{ name: 'x', type: 'int', init: 1, access: 'public' }] }),
      cls({ name: 'Derived', base: 'Base', fields: [{ name: 'y', type: 'int', init: 2, access: 'public' }] })],
      ops: [{ k: 'stack', v: 'a', cls: 'Resource' }, { k: 'copy', v: 'b', from: 'a' }, { k: 'move', v: 'c', from: 'a' }, { k: 'shared', v: 's1', cls: 'Resource' }, { k: 'shareCopy', v: 's2', from: 's1' }, { k: 'reset', v: 's1' }, { k: 'reset', v: 's2' },
        { k: 'unique', v: 'u1', cls: 'Resource' }, { k: 'uniqueMove', v: 'u2', from: 'u1' }, { k: 'stack', v: 'd', cls: 'Derived' }, { k: 'slice', v: 'sliced', as: 'Base', from: 'd' }, { k: 'scopeEnd' }] }) },
  { id: 'abstract', title: 'Abstract classes (pure virtual functions)', goal: 'A class with a pure virtual function is an interface: it cannot be instantiated, but derived classes can implement it.', toggles: [],
    build: () => ({ classes: [
      cls({ name: 'Shape', virtualDtor: true, methods: [{ name: 'area', virtual: true, pure: true, body: [] }] }),
      cls({ name: 'Square', base: 'Shape', methods: [{ name: 'area', override: true, body: [{ k: 'print', text: 'Square::area = s*s' }] }] })],
      ops: [{ k: 'stack', v: 'bad', cls: 'Shape' }, { k: 'heap', v: 'p', cls: 'Square', as: 'Shape' }, { k: 'call', v: 'p', m: 'area' }, { k: 'delete', v: 'p' }] }) },
];
