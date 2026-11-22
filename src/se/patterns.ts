// Design-pattern catalogue. C++17 reference snippets are shown for study; they have not been compiled by this app.
export interface Pattern { name: string; category: 'Creational' | 'Structural' | 'Behavioral'; intent: string; problem: string; structure: string; pros: string[]; cons: string[]; useWhen: string; code: string; demo?: string }

export const PATTERNS: Pattern[] = [
  { name: 'Singleton', category: 'Creational', intent: 'Ensure a class has exactly one instance with a global access point.', problem: 'A shared resource (configuration, logger) must not be duplicated.', structure: 'Private constructor + static accessor holding the single instance.', demo: 'singleton',
    pros: ['Controlled single instance', 'Lazy initialisation'], cons: ['Hidden global state, hard to test', 'Needs care in multithreaded code (C++11 static locals are thread-safe)'], useWhen: 'Truly one instance is needed (prefer dependency injection otherwise).',
    code: `class Logger {
public:
    static Logger& instance() {
        static Logger single;   // created once, thread-safe since C++11
        return single;
    }
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
    void log(const std::string& m) { std::cout << m << "\\n"; }
private:
    Logger() = default;
};` },
  { name: 'Factory Method', category: 'Creational', intent: 'Let a function/subclass decide which concrete class to instantiate.', problem: 'Client code should not depend on concrete classes it creates.', structure: 'Creator returns a Product interface; concrete creators return concrete products.', demo: 'factory',
    pros: ['Decouples creation from use', 'Easy to add products'], cons: ['More classes'], useWhen: 'The exact type is decided at run time or by configuration.',
    code: `struct Shape { virtual ~Shape() = default; virtual double area() const = 0; };
struct Circle : Shape { double r; explicit Circle(double r) : r(r) {} double area() const override { return 3.14159 * r * r; } };
struct Square : Shape { double s; explicit Square(double s) : s(s) {} double area() const override { return s * s; } };

std::unique_ptr<Shape> makeShape(const std::string& kind, double size) {
    if (kind == "circle") return std::make_unique<Circle>(size);
    if (kind == "square") return std::make_unique<Square>(size);
    throw std::invalid_argument("unknown shape");
}` },
  { name: 'Abstract Factory', category: 'Creational', intent: 'Create families of related objects without naming their concrete classes.', problem: 'A UI toolkit must produce matching buttons and checkboxes for each theme.', structure: 'An abstract factory interface with one creation method per product; one concrete factory per family.',
    pros: ['Guarantees compatible products', 'Swap whole families'], cons: ['Adding a new product type changes every factory'], useWhen: 'Products must be used together (Light theme widgets, Dark theme widgets).',
    code: `struct Button { virtual ~Button() = default; virtual std::string draw() const = 0; };
struct Checkbox { virtual ~Checkbox() = default; virtual std::string draw() const = 0; };
struct WidgetFactory { virtual ~WidgetFactory() = default;
    virtual std::unique_ptr<Button> button() const = 0;
    virtual std::unique_ptr<Checkbox> checkbox() const = 0; };
struct DarkButton : Button { std::string draw() const override { return "dark button"; } };
struct DarkCheckbox : Checkbox { std::string draw() const override { return "dark checkbox"; } };
struct DarkFactory : WidgetFactory {
    std::unique_ptr<Button> button() const override { return std::make_unique<DarkButton>(); }
    std::unique_ptr<Checkbox> checkbox() const override { return std::make_unique<DarkCheckbox>(); } };` },
  { name: 'Builder', category: 'Creational', intent: 'Construct a complex object step by step.', problem: 'A constructor with many optional parameters is unreadable.', structure: 'A builder accumulates settings through chained calls and produces the final object.',
    pros: ['Readable construction', 'Immutable results possible'], cons: ['Extra builder class'], useWhen: 'Objects have many optional parts (HTTP requests, SQL queries).',
    code: `class Pizza { public: std::string size; bool cheese = false; bool pepperoni = false; };
class PizzaBuilder {
    Pizza p_;
public:
    PizzaBuilder& size(std::string s) { p_.size = std::move(s); return *this; }
    PizzaBuilder& cheese()    { p_.cheese = true;    return *this; }
    PizzaBuilder& pepperoni() { p_.pepperoni = true; return *this; }
    Pizza build() const { return p_; }
};
// Pizza p = PizzaBuilder().size("large").cheese().pepperoni().build();` },
  { name: 'Prototype', category: 'Creational', intent: 'Create new objects by cloning an existing one.', problem: 'Construction is expensive or the concrete type is unknown at the call site.', structure: 'A clone() virtual function returning a copy.',
    pros: ['Avoids costly initialisation', 'Clone through a base pointer'], cons: ['Deep-copy subtleties'], useWhen: 'You hold a base pointer and need a copy of the dynamic type.',
    code: `struct Document {
    virtual ~Document() = default;
    virtual std::unique_ptr<Document> clone() const = 0;
};
struct Report : Document {
    std::string title;
    std::unique_ptr<Document> clone() const override { return std::make_unique<Report>(*this); }
};` },
  { name: 'Adapter', category: 'Structural', intent: 'Make an incompatible interface work with the one clients expect.', problem: 'A third-party class has the wrong interface.', structure: 'The adapter implements the target interface and forwards to the adaptee.',
    pros: ['Reuse existing code unchanged'], cons: ['Extra indirection'], useWhen: 'Integrating legacy or external code.',
    code: `struct Target { virtual ~Target() = default; virtual void request() = 0; };
struct LegacyPrinter { void printOldStyle(const std::string& s) { std::cout << s << "\\n"; } };
struct PrinterAdapter : Target {
    LegacyPrinter& legacy;
    explicit PrinterAdapter(LegacyPrinter& l) : legacy(l) {}
    void request() override { legacy.printOldStyle("adapted call"); }
};` },
  { name: 'Decorator', category: 'Structural', intent: 'Add responsibilities to an object dynamically by wrapping it.', problem: 'Subclassing for every feature combination explodes the class count.', structure: 'A decorator implements the same interface and holds the wrapped component.', demo: 'decorator',
    pros: ['Combine behaviours at run time', 'Open/Closed'], cons: ['Many small objects', 'Order matters'], useWhen: 'Optional, stackable features (I/O streams, coffee toppings).',
    code: `struct Coffee { virtual ~Coffee() = default; virtual double cost() const = 0; };
struct Espresso : Coffee { double cost() const override { return 2.0; } };
struct MilkDecorator : Coffee {
    std::unique_ptr<Coffee> inner;
    explicit MilkDecorator(std::unique_ptr<Coffee> c) : inner(std::move(c)) {}
    double cost() const override { return inner->cost() + 0.5; }
};` },
  { name: 'Facade', category: 'Structural', intent: 'Provide one simple interface to a complex subsystem.', problem: 'Clients must coordinate many classes to do one job.', structure: 'A facade class calls the subsystem objects in the right order.',
    pros: ['Simple API', 'Loose coupling to the subsystem'], cons: ['Can become a god object'], useWhen: 'Starting a computer, compiling a program, placing an order across services.',
    code: `class Computer {
    CPU cpu; Memory mem; Disk disk;
public:
    void start() { cpu.freeze(); mem.load(disk.read(0)); cpu.execute(); }
};` },
  { name: 'Proxy', category: 'Structural', intent: 'Control access to another object through a stand-in.', problem: 'You need lazy loading, access control, caching or logging around an object.', structure: 'The proxy implements the same interface and forwards (or refuses) calls.',
    pros: ['Transparent to clients', 'Lazy creation, protection'], cons: ['Added latency and indirection'], useWhen: 'Virtual proxy (lazy image), protection proxy, remote proxy.',
    code: `struct Image { virtual ~Image() = default; virtual void show() = 0; };
struct RealImage : Image { explicit RealImage(std::string f) { /* expensive load */ } void show() override {} };
struct LazyImage : Image {
    std::string file; std::unique_ptr<RealImage> real;
    explicit LazyImage(std::string f) : file(std::move(f)) {}
    void show() override { if (!real) real = std::make_unique<RealImage>(file); real->show(); }
};` },
  { name: 'Composite', category: 'Structural', intent: 'Treat single objects and groups of objects uniformly (tree structures).', problem: 'Clients should not care whether they hold a leaf or a container.', structure: 'A component interface with Leaf and Composite (which holds children).',
    pros: ['Uniform treatment', 'Easy to add node types'], cons: ['Over-general interface'], useWhen: 'File systems, UI widget trees, expression trees.',
    code: `struct Node { virtual ~Node() = default; virtual int size() const = 0; };
struct File : Node { int bytes; explicit File(int b) : bytes(b) {} int size() const override { return bytes; } };
struct Folder : Node {
    std::vector<std::unique_ptr<Node>> kids;
    int size() const override { int s = 0; for (auto& k : kids) s += k->size(); return s; }
};` },
  { name: 'Bridge', category: 'Structural', intent: 'Separate an abstraction from its implementation so both can vary independently.', problem: 'Shape × Renderer combinations would need a class for each pair.', structure: 'The abstraction holds a pointer to an implementor interface.',
    pros: ['Avoids a class explosion', 'Swap implementations at run time'], cons: ['More indirection'], useWhen: 'Two orthogonal dimensions of variation (remote × device, shape × renderer).',
    code: `struct Renderer { virtual ~Renderer() = default; virtual void circle(double r) = 0; };
struct VectorRenderer : Renderer { void circle(double r) override { /* draw scalable circle */ } };
struct RasterRenderer : Renderer { void circle(double r) override { /* draw pixels */ } };
struct Circle {
    Renderer& renderer; double r;
    Circle(Renderer& rd, double r) : renderer(rd), r(r) {}
    void draw() { renderer.circle(r); }
};` },
  { name: 'Observer', category: 'Behavioral', intent: 'Notify dependents automatically when an object changes.', problem: 'Many objects need to react to one object\'s state without tight coupling.', structure: 'A subject keeps a list of observers and calls update() on each.', demo: 'observer',
    pros: ['Loose coupling', 'Dynamic subscription'], cons: ['Unexpected update cascades', 'Lifetime/unsubscribe bugs'], useWhen: 'Events, model-view updates, publish/subscribe.',
    code: `struct Observer { virtual ~Observer() = default; virtual void update(const std::string& e) = 0; };
class Subject {
    std::vector<Observer*> obs_;
public:
    void subscribe(Observer* o)   { obs_.push_back(o); }
    void unsubscribe(Observer* o) { obs_.erase(std::remove(obs_.begin(), obs_.end(), o), obs_.end()); }
    void notify(const std::string& e) { for (auto* o : obs_) o->update(e); }
};` },
  { name: 'Strategy', category: 'Behavioral', intent: 'Define a family of interchangeable algorithms behind one interface.', problem: 'A switch on a type code is repeated in many places and must be edited for every new variant.', structure: 'A context holds a Strategy; concrete strategies implement the algorithm.', demo: 'strategy',
    pros: ['Open/Closed: add a class, change nothing else', 'Swap behaviour at run time', 'Testable in isolation'], cons: ['More classes', 'Clients must pick a strategy'], useWhen: 'Payment methods, sorting policies, compression algorithms.',
    code: `struct PaymentStrategy {
    virtual ~PaymentStrategy() = default;
    virtual double charge(double amount) const = 0;
    virtual double refund(double amount) const = 0;
    virtual std::string describe() const = 0;
};
struct CardPayment : PaymentStrategy {
    double charge(double a) const override { return a * 1.02; }
    double refund(double a) const override { return a; }
    std::string describe() const override { return "Card"; }
};
class Checkout {
    std::unique_ptr<PaymentStrategy> pay_;
public:
    explicit Checkout(std::unique_ptr<PaymentStrategy> p) : pay_(std::move(p)) {}
    double total(double amount) const { return pay_->charge(amount); }
};` },
  { name: 'Command', category: 'Behavioral', intent: 'Turn a request into an object so it can be queued, logged or undone.', problem: 'You need undo/redo, macros or a job queue.', structure: 'A command object has execute() and undo(); an invoker keeps a history stack.', demo: 'command',
    pros: ['Undo/redo', 'Decouples sender from receiver'], cons: ['Many small classes'], useWhen: 'Editors, task schedulers, transactional operations.',
    code: `struct Command { virtual ~Command() = default; virtual void execute() = 0; virtual void undo() = 0; };
struct InsertText : Command {
    std::string& doc; std::string text;
    InsertText(std::string& d, std::string t) : doc(d), text(std::move(t)) {}
    void execute() override { doc += text; }
    void undo() override { doc.erase(doc.size() - text.size()); }
};
// std::vector<std::unique_ptr<Command>> history; run execute(); to undo pop and call undo().` },
  { name: 'State', category: 'Behavioral', intent: 'Let an object change behaviour when its internal state changes.', problem: 'Large if/else blocks on a state variable in every method.', structure: 'A context delegates to a current State object, which can replace itself.', demo: 'state',
    pros: ['Removes state conditionals', 'Illegal transitions are explicit'], cons: ['More classes'], useWhen: 'Order lifecycle, TCP connection states, media players.',
    code: `class Order;
struct State { virtual ~State() = default; virtual void next(Order&) = 0; virtual const char* name() const = 0; };
class Order {
    std::unique_ptr<State> s_;
public:
    explicit Order(std::unique_ptr<State> s) : s_(std::move(s)) {}
    void setState(std::unique_ptr<State> s) { s_ = std::move(s); }
    void next() { s_->next(*this); }
};
struct Paid : State { void next(Order&) override { /* → Shipped */ } const char* name() const override { return "Paid"; } };` },
  { name: 'Iterator', category: 'Behavioral', intent: 'Traverse a collection without exposing its representation.', problem: 'Clients should not depend on whether data is stored in an array, list or tree.', structure: 'An iterator offers begin/end/++/*; the collection creates iterators.',
    pros: ['Uniform traversal', 'Multiple simultaneous traversals'], cons: ['Overhead for simple arrays'], useWhen: 'Standard containers; custom data structures used with range-for.',
    code: `// The C++ standard library is built on this pattern:
std::vector<int> v = {1, 2, 3};
for (auto it = v.begin(); it != v.end(); ++it) std::cout << *it;
for (int x : v) std::cout << x;      // range-for uses begin()/end() too
// To support range-for in your own class, provide begin() and end() returning iterators.` },
  { name: 'Template Method', category: 'Behavioral', intent: 'Define the skeleton of an algorithm in a base class and let subclasses fill in steps.', problem: 'Several algorithms share the same sequence but differ in some steps.', structure: 'A non-virtual public method calls virtual hook functions in a fixed order.',
    pros: ['Reuses the common flow', 'Controls extension points'], cons: ['Inheritance coupling'], useWhen: 'Frameworks, data-processing pipelines (read → process → write).',
    code: `class Report {
public:
    void generate() { header(); body(); footer(); }   // the template method
    virtual ~Report() = default;
protected:
    virtual void header() { std::cout << "== Report ==\\n"; }
    virtual void body() = 0;
    virtual void footer() { std::cout << "== end ==\\n"; }
};
class SalesReport : public Report { void body() override { std::cout << "sales data\\n"; } };` },
  { name: 'Chain of Responsibility', category: 'Behavioral', intent: 'Pass a request along a chain of handlers until one handles it.', problem: 'The sender should not know which object will process the request.', structure: 'Each handler either handles the request or forwards it to its successor.', demo: 'chain',
    pros: ['Decouples sender and receivers', 'Reorder or extend handlers freely'], cons: ['A request may go unhandled'], useWhen: 'Support escalation, middleware pipelines, event bubbling.',
    code: `struct Handler {
    Handler* next = nullptr;
    virtual ~Handler() = default;
    virtual bool handle(int severity) {
        return next ? next->handle(severity) : false;   // forward
    }
};
struct Level1 : Handler { bool handle(int s) override { return s <= 1 ? true : Handler::handle(s); } };
struct Level2 : Handler { bool handle(int s) override { return s <= 3 ? true : Handler::handle(s); } };` },
];
