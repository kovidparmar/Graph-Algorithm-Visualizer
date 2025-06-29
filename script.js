<<<<<<< HEAD
class Graph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
        this.directed = false;
        this.weighted = false;
        this.gridMode = false;
        this.gridSize = 20;
    }

    addNode(id, x, y) {
        this.nodes.set(id, {
            id,
            x,
            y,
            visited: false,
            distance: Infinity,
            previous: null,
            inQueue: false,
            hasNegativeCycle: false,
            inPath: false
        });
    }

    addEdge(from, to, weight = 1) {
        if (!this.edges.has(from)) this.edges.set(from, []);
        if (!this.edges.has(to)) this.edges.set(to, []);

        this.edges.get(from).push({ to, weight });
        if (!this.directed) {
            this.edges.get(to).push({ to: from, weight });
        }
    }

    removeNode(id) {
        this.nodes.delete(id);
        this.edges.delete(id);
        for (let [nodeId, connections] of this.edges) {
            this.edges.set(nodeId, connections.filter(edge => edge.to !== id));
        }
    }

    removeEdge(from, to) {
        if (this.edges.has(from)) {
            this.edges.set(from, this.edges.get(from).filter(edge => edge.to !== to));
        }
        if (!this.directed && this.edges.has(to)) {
            this.edges.set(to, this.edges.get(to).filter(edge => edge.to !== from));
        }
    }

    clear() {
        this.nodes.clear();
        this.edges.clear();
    }

    resetState() {
        for (let node of this.nodes.values()) {
            node.visited = false;
            node.distance = Infinity;
            node.previous = null;
            node.inQueue = false;
            node.hasNegativeCycle = false;
            node.inPath = false; // ACTUALLY IMPLEMENT THIS
        }
    }

    getNeighbors(nodeId) {
        return this.edges.get(nodeId) || [];
    }
}

class GraphVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }

        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Could not get 2D context');
        }

        this.graph = new Graph();
        this.selectedNode = null;
        this.dragging = false;
        this.nodeRadius = 25;
        this.colors = {
            node: '#4299e1',
            visited: '#48bb78',
            current: '#ed8936',
            path: '#e53e3e',
            edge: '#718096',
            text: '#2d3748'
        };
        this.animation = {
            running: false,
            paused: false,
            step: 0,
            steps: [],
            speed: 500
        };
        this.setupEventListeners();
        this.updateInputExample();
    }


    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleRightClick.bind(this));
        document.getElementById('speed').addEventListener('input', this.updateSpeed.bind(this));
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.graph.gridMode) {
            this.handleGridClick(x, y, e);
            return;
        }

        const clickedNode = this.getNodeAt(x, y);

        if (e.button === 0) { // Left click
            if (clickedNode) {
                if (e.shiftKey) {
                    // Start edge creation
                    this.selectedNode = clickedNode;
                } else {
                    // Start dragging
                    this.dragging = clickedNode;
                }
            } else {
                // Create new node
                const nodeId = this.generateNodeId();
                this.graph.addNode(nodeId, x, y);
                this.draw();
            }
        }
    }

    handleMouseMove(e) {
        if (!this.dragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const node = this.graph.nodes.get(this.dragging);
        if (node) {
            node.x = x;
            node.y = y;
            this.draw();
        }
    }

    handleMouseUp(e) {
        if (this.selectedNode && e.button === 0) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const targetNode = this.getNodeAt(x, y);

            if (targetNode && targetNode !== this.selectedNode) {
                const weight = this.graph.weighted ?
                    parseFloat(prompt("Enter edge weight:", "1") || "1") : 1;
                this.graph.addEdge(this.selectedNode, targetNode, weight);
                this.draw();
            }
            this.selectedNode = null;
        }
        this.dragging = false;
    }

    handleRightClick(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clickedNode = this.getNodeAt(x, y);
        if (clickedNode) {
            this.graph.removeNode(clickedNode);
            this.draw();
        }
    }

    handleGridClick(x, y, e) {
        const gridX = Math.floor(x / this.graph.gridSize);
        const gridY = Math.floor(y / this.graph.gridSize);
        const nodeId = `${gridX},${gridY}`;

        if (e.button === 0) { // Left click
            if (this.graph.nodes.has(nodeId)) {
                // Remove obstacle
                this.graph.removeNode(nodeId);
            } else {
                // Add obstacle or path
                this.graph.addNode(nodeId, gridX * this.graph.gridSize + this.graph.gridSize / 2,
                    gridY * this.graph.gridSize + this.graph.gridSize / 2);
                // Connect to adjacent nodes
                this.connectGridNode(gridX, gridY);
            }
            this.draw();
        }
    }

    connectGridNode(gridX, gridY) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const currentId = `${gridX},${gridY}`;

        for (let [dx, dy] of directions) {
            const neighborX = gridX + dx;
            const neighborY = gridY + dy;
            const neighborId = `${neighborX},${neighborY}`;

            if (this.graph.nodes.has(neighborId)) {
                this.graph.addEdge(currentId, neighborId, 1);
            }
        }
    }

    getNodeAt(x, y) {
        for (let [id, node] of this.graph.nodes) {
            const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
            if (distance <= this.nodeRadius) {
                return id;
            }
        }
        return null;
    }

    generateNodeId() {
        let id = 0;
        while (this.graph.nodes.has(id.toString())) {
            id++;
        }
        return id.toString();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.graph.gridMode) {
            this.drawGrid();
        }

        this.drawEdges();
        this.drawNodes();
    }

    drawGrid() {
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.canvas.width; x += this.graph.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.canvas.height; y += this.graph.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawEdges() {
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = this.colors.edge;

        for (let [fromId, connections] of this.graph.edges) {
            const fromNode = this.graph.nodes.get(fromId);
            if (!fromNode) continue;

            for (let edge of connections) {
                const toNode = this.graph.nodes.get(edge.to);
                if (!toNode) continue;

                // Skip drawing duplicate edges for undirected graphs
                if (!this.graph.directed && fromId > edge.to) continue;

                this.ctx.beginPath();
                this.ctx.moveTo(fromNode.x, fromNode.y);
                this.ctx.lineTo(toNode.x, toNode.y);
                this.ctx.stroke();

                // Draw arrow for directed graphs
                if (this.graph.directed) {
                    this.drawArrow(fromNode.x, fromNode.y, toNode.x, toNode.y);
                }

                // Draw weight
                if (this.graph.weighted) {
                    const midX = (fromNode.x + toNode.x) / 2;
                    const midY = (fromNode.y + toNode.y) / 2;
                    this.ctx.fillStyle = '#fff';
                    this.ctx.fillRect(midX - 10, midY - 8, 20, 16);
                    this.ctx.fillStyle = this.colors.text;
                    this.ctx.font = '12px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(edge.weight.toString(), midX, midY + 4);
                }
            }
        }
    }

    drawArrow(fromX, fromY, toX, toY) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6;

        // Calculate arrow position (on edge of target node)
        const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
        const arrowX = toX - (this.nodeRadius * (toX - fromX)) / distance;
        const arrowY = toY - (this.nodeRadius * (toY - fromY)) / distance;

        this.ctx.beginPath();
        this.ctx.moveTo(arrowX, arrowY);
        this.ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle - arrowAngle),
            arrowY - arrowLength * Math.sin(angle - arrowAngle)
        );
        this.ctx.moveTo(arrowX, arrowY);
        this.ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle + arrowAngle),
            arrowY - arrowLength * Math.sin(angle + arrowAngle)
        );
        this.ctx.stroke();
    }

    // Add this method to GraphVisualizer class:
    validateAlgorithmInput(algorithm, startNode, endNode) {
        if (this.graph.nodes.size === 0) {
            return { valid: false, message: 'Graph is empty' };
        }

        if (startNode && !this.graph.nodes.has(startNode)) {
            return { valid: false, message: `Start node '${startNode}' does not exist in the graph` };
        }

        if (endNode && !this.graph.nodes.has(endNode)) {
            return { valid: false, message: `End node '${endNode}' does not exist in the graph` };
        }

        if (algorithm === 'dijkstra' && this.graph.weighted) {
            // Check for negative weights
            for (let [_, connections] of this.graph.edges) {
                for (let edge of connections) {
                    if (edge.weight < 0) {
                        return { valid: false, message: 'Dijkstra cannot handle negative weights. Use Bellman-Ford instead.' };
                    }
                }
            }
        }

        if ((algorithm === 'dijkstra' || algorithm === 'bellmanford') && !startNode) {
            return { valid: false, message: 'Start node is required for this algorithm' };
        }

        return { valid: true };
    }

    drawNodes() {
        for (let [id, node] of this.graph.nodes) {
            let color = this.colors.node;

            // Proper priority order for colors
            if (node.visited) color = this.colors.visited;
            if (node.inQueue) color = this.colors.current;
            if (node.hasNegativeCycle) color = '#e53e3e';
            if (node.inPath) color = this.colors.path; // Highest priority

            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, this.nodeRadius, 0, 2 * Math.PI);
            this.ctx.fill();

            this.ctx.strokeStyle = '#2d3748';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw node label
            this.ctx.fillStyle = this.colors.text;
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(id, node.x, node.y + 5);

            // Draw distance for algorithms that use it
            if (node.distance !== Infinity && node.distance !== undefined) {
                this.ctx.font = '10px Arial';
                this.ctx.fillText(`d:${node.distance}`, node.x, node.y - 20);
            }
        }
    }


    // Algorithm implementations
    async bfs(startId) {
        const steps = [];
        const queue = [startId];
        const visited = new Set();

        steps.push({ type: 'start', node: startId, message: 'Starting BFS from node ' + startId });

        while (queue.length > 0) {
            const currentId = queue.shift();

            if (visited.has(currentId)) continue;

            visited.add(currentId);
            steps.push({
                type: 'visit',
                node: currentId,
                queue: [...queue],
                message: `Visiting node ${currentId}. Queue: [${queue.join(', ')}]`
            });

            const neighbors = this.graph.getNeighbors(currentId);
            for (let edge of neighbors) {
                if (!visited.has(edge.to)) {
                    queue.push(edge.to);
                    steps.push({
                        type: 'discover',
                        node: edge.to,
                        queue: [...queue],
                        message: `Discovered node ${edge.to}. Added to queue.`
                    });
                }
            }
        }

        return steps;
    }

    async dfs(startId) {
        const steps = [];
        const visited = new Set();

        const dfsRecursive = (nodeId) => {
            visited.add(nodeId);
            steps.push({
                type: 'visit',
                node: nodeId,
                message: `Visiting node ${nodeId} (DFS)`
            });

            const neighbors = this.graph.getNeighbors(nodeId);
            for (let edge of neighbors) {
                if (!visited.has(edge.to)) {
                    steps.push({
                        type: 'discover',
                        node: edge.to,
                        message: `Exploring neighbor ${edge.to}`
                    });
                    dfsRecursive(edge.to);
                }
            }
        };

        steps.push({ type: 'start', node: startId, message: 'Starting DFS from node ' + startId });
        dfsRecursive(startId);
        return steps;
    }

    async dijkstra(startId, endId = null) {
        const steps = [];
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();

        // Initialize
        for (let nodeId of this.graph.nodes.keys()) {
            distances.set(nodeId, Infinity);
            previous.set(nodeId, null);
            unvisited.add(nodeId);
        }
        distances.set(startId, 0);

        steps.push({ type: 'start', node: startId, message: 'Starting Dijkstra from node ' + startId });

        while (unvisited.size > 0) {
            // Find node with minimum distance
            let currentId = null;
            let minDistance = Infinity;
            for (let nodeId of unvisited) {
                if (distances.get(nodeId) < minDistance) {
                    minDistance = distances.get(nodeId);
                    currentId = nodeId;
                }
            }

            if (currentId === null || distances.get(currentId) === Infinity) break;

            unvisited.delete(currentId);
            steps.push({
                type: 'visit',
                node: currentId,
                distance: distances.get(currentId),
                message: `Visiting node ${currentId} with distance ${distances.get(currentId)}`
            });

            if (currentId === endId) {
                steps.push({ type: 'found', node: currentId, message: 'Reached target node!' });
                break;
            }

            // Update neighbors
            const neighbors = this.graph.getNeighbors(currentId);
            for (let edge of neighbors) {
                if (unvisited.has(edge.to)) {
                    const newDistance = distances.get(currentId) + edge.weight;
                    if (newDistance < distances.get(edge.to)) {
                        distances.set(edge.to, newDistance);
                        previous.set(edge.to, currentId);
                        steps.push({
                            type: 'update',
                            node: edge.to,
                            distance: newDistance,
                            message: `Updated distance to ${edge.to}: ${newDistance}`
                        });
                    }
                }
            }
        }

        // Reconstruct path if end node specified
        if (endId && distances.get(endId) !== Infinity) {
            const path = [];
            let current = endId;
            while (current !== null) {
                path.unshift(current);
                current = previous.get(current);
            }
            steps.push({ type: 'path', path: path, message: `Shortest path: ${path.join(' → ')}` });
        }

        return steps;
    }
    // Add these methods to your GraphVisualizer class

    // Bellman-Ford Algorithm - Add this method inside the GraphVisualizer class
    async bellmanFord(startId, endId = null) {
        const steps = [];
        const distances = new Map();
        const previous = new Map();
        const nodes = Array.from(this.graph.nodes.keys());
        const edges = [];
        const processedEdges = new Set();

        // Collect all edges
        for (let [fromId, connections] of this.graph.edges) {
            for (let edge of connections) {
                if (this.graph.directed) {
                    // For directed graphs, add edge as-is
                    edges.push({ from: fromId, to: edge.to, weight: edge.weight });
                } else {
                    // For undirected graphs, add each edge only once to avoid duplicates
                    const edgeKey = [fromId, edge.to].sort().join('-');
                    if (!processedEdges.has(edgeKey)) {
                        processedEdges.add(edgeKey);
                        // Add both directions for undirected graph
                        edges.push({ from: fromId, to: edge.to, weight: edge.weight });
                        edges.push({ from: edge.to, to: fromId, weight: edge.weight });
                    }
                }
            }
        }

        // Initialize distances
        for (let nodeId of nodes) {
            distances.set(nodeId, Infinity);
            previous.set(nodeId, null);
        }
        distances.set(startId, 0);

        steps.push({
            type: 'start',
            node: startId,
            message: `Starting Bellman-Ford from node ${startId}. Relaxing edges ${nodes.length - 1} times.`
        });

        // Relax edges |V| - 1 times
        for (let i = 0; i < nodes.length - 1; i++) {
            steps.push({
                type: 'iteration',
                iteration: i + 1,
                message: `Iteration ${i + 1}: Relaxing all edges`
            });

            let updated = false;
            for (let edge of edges) {
                const currentDist = distances.get(edge.from);
                const newDist = currentDist + edge.weight;

                if (currentDist !== Infinity && newDist < distances.get(edge.to)) {
                    distances.set(edge.to, newDist);
                    previous.set(edge.to, edge.from);
                    updated = true;

                    steps.push({
                        type: 'update',
                        node: edge.to,
                        distance: newDist,
                        from: edge.from,
                        message: `Relaxed edge ${edge.from} → ${edge.to}: distance updated to ${newDist}`
                    });
                }
            }

            if (!updated) {
                steps.push({
                    type: 'early_termination',
                    message: 'No updates in this iteration. Algorithm can terminate early.'
                });
                break;
            }
        }

        // Check for negative cycles
        steps.push({
            type: 'negative_cycle_check',
            message: 'Checking for negative cycles...'
        });

        let hasNegativeCycle = false;
        for (let edge of edges) {
            const currentDist = distances.get(edge.from);
            const newDist = currentDist + edge.weight;

            if (currentDist !== Infinity && newDist < distances.get(edge.to)) {
                hasNegativeCycle = true;
                steps.push({
                    type: 'negative_cycle',
                    edge: edge,
                    message: `Negative cycle detected! Edge ${edge.from} → ${edge.to} can still be relaxed.`
                });
                break;
            }
        }

        if (!hasNegativeCycle) {
            steps.push({
                type: 'no_negative_cycle',
                message: 'No negative cycles found. Algorithm completed successfully.'
            });

            // Reconstruct path if end node specified
            if (endId && distances.get(endId) !== Infinity) {
                const path = [];
                let current = endId;
                while (current !== null) {
                    path.unshift(current);
                    current = previous.get(current);
                }
                steps.push({
                    type: 'path',
                    path: path,
                    distance: distances.get(endId),
                    message: `Shortest path to ${endId}: ${path.join(' → ')} (distance: ${distances.get(endId)})`
                });
            }
        }

        return steps;
    }

    // Floyd-Warshall Algorithm - Add this method inside the GraphVisualizer class
    async floydWarshall() {
        const steps = [];
        const nodes = Array.from(this.graph.nodes.keys());
        const n = nodes.length;
        const dist = new Map();
        const next = new Map();

        // Initialize distance matrix
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const key = `${nodes[i]}-${nodes[j]}`;
                if (i === j) {
                    dist.set(key, 0);
                } else {
                    dist.set(key, Infinity);
                }
                next.set(key, null);
            }
        }

        // Set edge weights
        for (let [fromId, connections] of this.graph.edges) {
            for (let edge of connections) {
                const key = `${fromId}-${edge.to}`;
                dist.set(key, edge.weight);
                next.set(key, edge.to);
            }
        }

        steps.push({
            type: 'start',
            message: 'Starting Floyd-Warshall algorithm. Initializing distance matrix.'
        });

        // Floyd-Warshall main algorithm
        for (let k = 0; k < n; k++) {
            steps.push({
                type: 'iteration',
                k: nodes[k],
                iteration: k + 1,
                message: `Iteration ${k + 1}: Using node ${nodes[k]} as intermediate vertex`
            });

            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    const ikKey = `${nodes[i]}-${nodes[k]}`;
                    const kjKey = `${nodes[k]}-${nodes[j]}`;
                    const ijKey = `${nodes[i]}-${nodes[j]}`;

                    const ikDist = dist.get(ikKey);
                    const kjDist = dist.get(kjKey);
                    const currentDist = dist.get(ijKey);
                    const newDist = ikDist + kjDist;

                    if (ikDist !== Infinity && kjDist !== Infinity && newDist < currentDist) {
                        dist.set(ijKey, newDist);
                        next.set(ijKey, next.get(ikKey));

                        steps.push({
                            type: 'update',
                            from: nodes[i],
                            to: nodes[j],
                            via: nodes[k],
                            oldDistance: currentDist === Infinity ? '∞' : currentDist,
                            newDistance: newDist,
                            message: `Updated distance ${nodes[i]} → ${nodes[j]} via ${nodes[k]}: ${currentDist === Infinity ? '∞' : currentDist} → ${newDist}`
                        });
                    }
                }
            }
        }

        // Check for negative cycles
        let hasNegativeCycle = false;
        for (let i = 0; i < n; i++) {
            const key = `${nodes[i]}-${nodes[i]}`;
            if (dist.get(key) < 0) {
                hasNegativeCycle = true;
                steps.push({
                    type: 'negative_cycle',
                    node: nodes[i],
                    message: `Negative cycle detected involving node ${nodes[i]}`
                });
            }
        }

        if (!hasNegativeCycle) {
            steps.push({
                type: 'complete',
                message: 'Floyd-Warshall completed. All shortest paths computed.'
            });

            // Add final distance matrix
            const matrix = [];
            for (let i = 0; i < n; i++) {
                const row = [];
                for (let j = 0; j < n; j++) {
                    const key = `${nodes[i]}-${nodes[j]}`;
                    const distance = dist.get(key);
                    row.push(distance === Infinity ? '∞' : distance);
                }
                matrix.push(row);
            }

            steps.push({
                type: 'matrix',
                nodes: nodes,
                matrix: matrix,
                message: 'Final all-pairs shortest path distances'
            });
        }

        return steps;
    }


    async runAnimation(steps) {
        this.animation.running = true;
        this.animation.paused = false;
        this.animation.steps = steps;
        this.animation.step = 0;

        document.getElementById('algorithmInfo').style.display = 'block';

        for (let i = 0; i < steps.length && this.animation.running; i++) {
            if (this.animation.paused) {
                await new Promise(resolve => {
                    const checkPause = () => {
                        if (!this.animation.paused || !this.animation.running) {
                            resolve();
                        } else {
                            setTimeout(checkPause, 100);
                        }
                    };
                    checkPause();
                });
            }

            if (!this.animation.running) break;

            this.animation.step = i;
            await this.executeStep(steps[i]);
            await new Promise(resolve => setTimeout(resolve, this.animation.speed));
        }

        this.animation.running = false;
    }

    async executeStep(step) {
        const node = this.graph.nodes.get(step.node);

        switch (step.type) {
            case 'start':
                this.graph.resetState();
                if (node) {
                    node.inQueue = true;
                }
                break;

            case 'visit':
                if (node) {
                    node.visited = true;
                    node.inQueue = false;
                    if (step.distance !== undefined) {
                        node.distance = step.distance;
                    }
                }
                // Update queue visualization
                if (step.queue) {
                    for (let [id, n] of this.graph.nodes) {
                        n.inQueue = step.queue.includes(id) && !n.visited;
                    }
                }
                break;

            case 'discover':
                if (node) {
                    node.inQueue = true;
                }
                break;

            case 'update':
                if (node && step.distance !== undefined) {
                    node.distance = step.distance;
                }
                break;

            case 'path':
                // Highlight the shortest path
                for (let nodeId of step.path) {
                    const pathNode = this.graph.nodes.get(nodeId);
                    if (pathNode) {
                        pathNode.inPath = true;
                    }
                }
                break;
            // Update the executeStep method - Add these cases to the existing switch statement
            // Add these cases to your existing executeStep method's switch statement:

            case 'iteration':
                // For both algorithms - just display the iteration info
                break;

            case 'early_termination':
            case 'negative_cycle_check':
            case 'no_negative_cycle':
            case 'complete':
                // These are just informational steps
                break;

            case 'negative_cycle':
                // Highlight the problematic edge or node
                if (step.edge) {
                    const fromNode = this.graph.nodes.get(step.edge.from);
                    const toNode = this.graph.nodes.get(step.edge.to);
                    if (fromNode) fromNode.hasNegativeCycle = true;
                    if (toNode) toNode.hasNegativeCycle = true;
                }
                if (step.node) {
                    const problemNode = this.graph.nodes.get(step.node);
                    if (problemNode) problemNode.hasNegativeCycle = true;
                }
                break;

            case 'matrix':
                // Display the final matrix in the algorithm details
                let matrixHtml = '<h5>Final Distance Matrix:</h5><table border="1" style="font-size: 12px; margin: 10px 0;"><tr><th></th>';
                for (let node of step.nodes) {
                    matrixHtml += `<th>${node}</th>`;
                }
                matrixHtml += '</tr>';

                for (let i = 0; i < step.nodes.length; i++) {
                    matrixHtml += `<tr><th>${step.nodes[i]}</th>`;
                    for (let j = 0; j < step.matrix[i].length; j++) {
                        matrixHtml += `<td style="padding: 5px; text-align: center;">${step.matrix[i][j]}</td>`;
                    }
                    matrixHtml += '</tr>';
                }
                matrixHtml += '</table>';

                // Replace instead of append
                document.getElementById('algorithmDetails').innerHTML = matrixHtml;
                break;

        }

        // At the end of executeStep method, replace the existing line:
        document.getElementById('algorithmDetails').innerHTML =
            `<p><strong>Step ${this.animation.step + 1}/${this.animation.steps.length}:</strong> ${step.message}</p>`;

        this.draw();
        this.drawPathHighlight();
    }

    drawPathHighlight() {
        // Draw path highlighting for nodes in the shortest path
        for (let [id, node] of this.graph.nodes) {
            if (node.inPath) {
                this.ctx.strokeStyle = this.colors.path;
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, this.nodeRadius + 3, 0, 2 * Math.PI);
                this.ctx.stroke();
            }
        }
    }

    updateColors() {
        this.colors.node = document.getElementById('nodeColor').value;
        this.colors.visited = document.getElementById('visitedColor').value;
        this.colors.current = document.getElementById('currentColor').value;
        this.colors.path = document.getElementById('pathColor').value;
        this.draw();
    }

    updateSpeed() {
        const speed = document.getElementById('speed').value;
        document.getElementById('speedValue').textContent = speed;
        this.animation.speed = 1100 - (speed * 100); // Invert so higher value = faster
    }

    parseInput(format, data) {
        this.graph.clear();

        try {
            switch (format) {
                case 'adjacency_list':
                    this.parseAdjacencyList(data);
                    break;
                case 'adjacency_matrix':
                    this.parseAdjacencyMatrix(data);
                    break;
                case 'edge_list':
                    this.parseEdgeList(data);
                    break;
            }
            this.layoutNodes();
            this.draw();
            return { success: true, message: 'Graph loaded successfully!' };
        } catch (error) {
            return { success: false, message: 'Error parsing input: ' + error.message };
        }
    }

    parseAdjacencyList(data) {
        const lines = data.trim().split('\n');
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            const [nodeStr, neighborsStr] = line.split(':');
            const nodeId = nodeStr.trim();

            if (!this.graph.nodes.has(nodeId)) {
                this.graph.addNode(nodeId, 0, 0);
            }

            if (neighborsStr) {
                const neighbors = neighborsStr.split(',');
                for (let neighbor of neighbors) {
                    neighbor = neighbor.trim();
                    if (neighbor) {
                        let targetId, weight = 1;

                        if (this.graph.weighted && neighbor.includes('(')) {
                            const match = neighbor.match(/(.+)\((\d+(?:\.\d+)?)\)/);
                            if (match) {
                                targetId = match[1].trim();
                                weight = parseFloat(match[2]);
                            } else {
                                targetId = neighbor;
                            }
                        } else {
                            targetId = neighbor;
                        }

                        if (!this.graph.nodes.has(targetId)) {
                            this.graph.addNode(targetId, 0, 0);
                        }

                        this.graph.addEdge(nodeId, targetId, weight);
                    }
                }
            }
        }
    }

    parseAdjacencyMatrix(data) {
        const lines = data.trim().split('\n');
        const matrix = [];

        for (let line of lines) {
            const row = line.trim().split(/\s+/).map(x => parseFloat(x));
            matrix.push(row);
        }

        const size = matrix.length;
        for (let i = 0; i < size; i++) {
            this.graph.addNode(i.toString(), 0, 0);
        }

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (matrix[i][j] > 0) {
                    this.graph.addEdge(i.toString(), j.toString(), matrix[i][j]);
                }
            }
        }
    }

    parseEdgeList(data) {
        const lines = data.trim().split('\n');
        const nodes = new Set();

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            const parts = line.split(/\s+/);
            const from = parts[0];
            const to = parts[1];
            const weight = this.graph.weighted && parts[2] ? parseFloat(parts[2]) : 1;

            nodes.add(from);
            nodes.add(to);

            if (!this.graph.nodes.has(from)) {
                this.graph.addNode(from, 0, 0);
            }
            if (!this.graph.nodes.has(to)) {
                this.graph.addNode(to, 0, 0);
            }

            this.graph.addEdge(from, to, weight);
        }
    }

    layoutNodes() {
        const nodes = Array.from(this.graph.nodes.keys());
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.7;

        if (nodes.length === 1) {
            const node = this.graph.nodes.get(nodes[0]);
            node.x = centerX;
            node.y = centerY;
        } else {
            for (let i = 0; i < nodes.length; i++) {
                const angle = (2 * Math.PI * i) / nodes.length;
                const node = this.graph.nodes.get(nodes[i]);
                node.x = centerX + radius * Math.cos(angle);
                node.y = centerY + radius * Math.sin(angle);
            }
        }
    }

    updateInputExample() {
        const format = document.getElementById('inputFormat').value;
        const exampleDiv = document.getElementById('inputExample');

        let example = '';
        switch (format) {
            case 'adjacency_list':
                example = `Example:\nA: B, C\nB: A, D\nC: A, D\nD: B, C\n\nWith weights:\nA: B(2), C(3)\nB: A(2), D(1)`;
                break;
            case 'adjacency_matrix':
                example = `Example:\n0 1 1 0\n1 0 0 1\n1 0 0 1\n0 1 1 0\n\nWith weights:\n0 2 3 0\n2 0 0 1\n3 0 0 1\n0 1 1 0`;
                break;
            case 'edge_list':
                example = `Example:\nA B\nA C\nB D\nC D\n\nWith weights:\nA B 2\nA C 3\nB D 1\nC D 1`;
                break;
        }

        exampleDiv.textContent = example;
    }
}

// Global variables
let visualizer;

// Initialize the application
window.onload = function () {
    visualizer = new GraphVisualizer('graphCanvas');
    visualizer.updateInputExample();
};

// Global functions for UI interaction
function toggleDirected() {
    visualizer.graph.directed = document.getElementById('directed').checked;
    visualizer.draw();
}

function toggleWeighted() {
    visualizer.graph.weighted = document.getElementById('weighted').checked;
    visualizer.draw();
}

function toggleGridMode() {
    visualizer.graph.gridMode = document.getElementById('gridMode').checked;
    if (visualizer.graph.gridMode) {
        visualizer.graph.clear();
    }
    visualizer.draw();
}

function clearGraph() {
    visualizer.graph.clear();
    visualizer.animation.running = false;
    document.getElementById('algorithmInfo').style.display = 'none';
    visualizer.draw();
}

function updateInputExample() {
    visualizer.updateInputExample();
}

function parseGraphInput() {
    const format = document.getElementById('inputFormat').value;
    const data = document.getElementById('graphInput').value;
    const messageDiv = document.getElementById('inputMessage');

    if (!data.trim()) {
        messageDiv.innerHTML = '<div class="error">Please enter graph data</div>';
        return;
    }

    // Add format-specific validation
    if (format === 'adjacency_matrix' && visualizer.graph.weighted) {
        const lines = data.trim().split('\n');
        const firstRowLength = lines[0].trim().split(/\s+/).length;
        if (lines.length !== firstRowLength) {
            messageDiv.innerHTML = '<div class="error">Matrix must be square (same number of rows and columns)</div>';
            return;
        }
    }

    const result = visualizer.parseInput(format, data);

    if (result.success) {
        messageDiv.innerHTML = `<div class="success">${result.message}</div>`;
        setTimeout(() => messageDiv.innerHTML = '', 3000); // Clear after 3 seconds
    } else {
        messageDiv.innerHTML = `<div class="error">${result.message}</div>`;
    }
}

async function startVisualization() {
    const algorithm = document.getElementById('algorithm').value;
    const startNode = document.getElementById('startNode').value.trim();
    const endNode = document.getElementById('endNode').value.trim();

    const validation = visualizer.validateAlgorithmInput(algorithm, startNode, endNode);
    if (!validation.valid) {
        alert(validation.message);
        return;
    }

    if (!startNode) {
        alert('Please enter a start node');
        return;
    }

    if (!visualizer.graph.nodes.has(startNode)) {
        alert('Start node does not exist in the graph');
        return;
    }

    if (algorithm === 'dijkstra' && endNode && !visualizer.graph.nodes.has(endNode)) {
        alert('End node does not exist in the graph');
        return;
    }

    visualizer.animation.running = false;
    visualizer.graph.resetState();

    let steps;
    switch (algorithm) {
        case 'bfs':
            steps = await visualizer.bfs(startNode);
            break;
        case 'dfs':
            steps = await visualizer.dfs(startNode);
            break;
        case 'dijkstra':
            steps = await visualizer.dijkstra(startNode, endNode || null);
            // After this line:
            // steps = await visualizer.dijkstra(startNode, endNode || null);

            // Add these lines:
            visualizer.animation.steps = steps;
            visualizer.animation.step = 0;
            visualizer.animation.running = true; // Set this to enable stepping
            break;
        case 'bellmanford':
            steps = await visualizer.bellmanFord(startNode, endNode || null);
            break;
        case 'floydwarshall':
            steps = await visualizer.floydWarshall();
            break;
    }

    // Store steps for manual stepping
    visualizer.animation.steps = steps;
    visualizer.animation.step = 0;
    visualizer.animation.running = true;

    // Show the algorithm info panel
    document.getElementById('algorithmInfo').style.display = 'block';

    // Start with first step displayed
    if (steps.length > 0) {
        await visualizer.executeStep(steps[0]);
        visualizer.animation.step = 1;
    }
}

async function startAutoVisualization() {
    const algorithm = document.getElementById('algorithm').value;
    const startNode = document.getElementById('startNode').value.trim();
    const endNode = document.getElementById('endNode').value.trim();

    const validation = visualizer.validateAlgorithmInput(algorithm, startNode, endNode);
    if (!validation.valid) {
        alert(validation.message);
        return;
    }

    if (!startNode) {
        alert('Please enter a start node');
        return;
    }

    visualizer.animation.running = false;
    visualizer.graph.resetState();

    let steps;
    switch (algorithm) {
        case 'bfs':
            steps = await visualizer.bfs(startNode);
            break;
        case 'dfs':
            steps = await visualizer.dfs(startNode);
            break;
        case 'dijkstra':
            steps = await visualizer.dijkstra(startNode, endNode || null);
            break;
        case 'bellmanford':
            steps = await visualizer.bellmanFord(startNode, endNode || null);
            break;
        case 'floydwarshall':
            steps = await visualizer.floydWarshall();
            break;
    }

    await visualizer.runAnimation(steps);
}

function pauseVisualization() {
    if (visualizer.animation.running) {
        visualizer.animation.paused = !visualizer.animation.paused;
        const button = document.getElementById('pauseBtn');
        button.textContent = visualizer.animation.paused ? 'Resume' : 'Pause';
        button.className = visualizer.animation.paused ? 'btn-success' : 'btn-warning';
    }
}

function stepVisualization() {
    if (visualizer.animation.steps &&
        visualizer.animation.step < visualizer.animation.steps.length) {

        visualizer.executeStep(visualizer.animation.steps[visualizer.animation.step]);
        visualizer.animation.step++;

        if (visualizer.animation.step >= visualizer.animation.steps.length) {
            visualizer.animation.running = false;
        }
    } else {
        alert('No algorithm running or all steps completed');
    }
}

function resetVisualization() {
    visualizer.animation.running = false;
    visualizer.animation.paused = false;
    visualizer.animation.step = 0;
    visualizer.animation.steps = []; // Add this line
    visualizer.graph.resetState();

    document.getElementById('algorithmInfo').style.display = 'none';

    // Fix specific pause button
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.textContent = 'Pause';
        pauseBtn.className = 'btn-warning';
    }

    visualizer.draw();
}

function updateColors() {
    visualizer.updateColors();
}

// Algorithm selection change handler
document.addEventListener('DOMContentLoaded', function () {
    const algorithmSelect = document.getElementById('algorithm');
    const endNodeGroup = document.getElementById('endNodeGroup');

    algorithmSelect.addEventListener('change', function () {
        if (this.value === 'dijkstra' || this.value === 'bellmanford') {
            endNodeGroup.style.display = 'block';
        } else {
            endNodeGroup.style.display = 'none';
        }
    });

    // Initial state
    if (algorithmSelect.value !== 'dijkstra') {
        endNodeGroup.style.display = 'none';
    }
=======
class Graph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
        this.directed = false;
        this.weighted = false;
        this.gridMode = false;
        this.gridSize = 20;
    }

    addNode(id, x, y) {
        this.nodes.set(id, {
            id,
            x,
            y,
            visited: false,
            distance: Infinity,
            previous: null,
            inQueue: false,
            hasNegativeCycle: false,
            inPath: false
        });
    }

    addEdge(from, to, weight = 1) {
        if (!this.edges.has(from)) this.edges.set(from, []);
        if (!this.edges.has(to)) this.edges.set(to, []);

        this.edges.get(from).push({ to, weight });
        if (!this.directed) {
            this.edges.get(to).push({ to: from, weight });
        }
    }

    removeNode(id) {
        this.nodes.delete(id);
        this.edges.delete(id);
        for (let [nodeId, connections] of this.edges) {
            this.edges.set(nodeId, connections.filter(edge => edge.to !== id));
        }
    }

    removeEdge(from, to) {
        if (this.edges.has(from)) {
            this.edges.set(from, this.edges.get(from).filter(edge => edge.to !== to));
        }
        if (!this.directed && this.edges.has(to)) {
            this.edges.set(to, this.edges.get(to).filter(edge => edge.to !== from));
        }
    }

    clear() {
        this.nodes.clear();
        this.edges.clear();
    }

    resetState() {
        for (let node of this.nodes.values()) {
            node.visited = false;
            node.distance = Infinity;
            node.previous = null;
            node.inQueue = false;
            // Update the resetState method in the Graph class - Add this line:
            // Add this line to your existing resetState method:
            node.hasNegativeCycle = false;
        }
    }

    getNeighbors(nodeId) {
        return this.edges.get(nodeId) || [];
    }
}

class GraphVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.graph = new Graph();
        this.selectedNode = null;
        this.dragging = false;
        this.nodeRadius = 25;
        this.colors = {
            node: '#4299e1',
            visited: '#48bb78',
            current: '#ed8936',
            path: '#e53e3e',
            edge: '#718096',
            text: '#2d3748'
        };
        this.animation = {
            running: false,
            paused: false,
            step: 0,
            steps: [],
            speed: 500
        };
        this.setupEventListeners();
        this.updateInputExample();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleRightClick.bind(this));
        document.getElementById('speed').addEventListener('input', this.updateSpeed.bind(this));
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.graph.gridMode) {
            this.handleGridClick(x, y, e);
            return;
        }

        const clickedNode = this.getNodeAt(x, y);

        if (e.button === 0) { // Left click
            if (clickedNode) {
                if (e.shiftKey) {
                    // Start edge creation
                    this.selectedNode = clickedNode;
                } else {
                    // Start dragging
                    this.dragging = clickedNode;
                }
            } else {
                // Create new node
                const nodeId = this.generateNodeId();
                this.graph.addNode(nodeId, x, y);
                this.draw();
            }
        }
    }

    handleMouseMove(e) {
        if (!this.dragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const node = this.graph.nodes.get(this.dragging);
        if (node) {
            node.x = x;
            node.y = y;
            this.draw();
        }
    }

    handleMouseUp(e) {
        if (this.selectedNode && e.button === 0) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const targetNode = this.getNodeAt(x, y);

            if (targetNode && targetNode !== this.selectedNode) {
                const weight = this.graph.weighted ?
                    parseFloat(prompt("Enter edge weight:", "1") || "1") : 1;
                this.graph.addEdge(this.selectedNode, targetNode, weight);
                this.draw();
            }
            this.selectedNode = null;
        }
        this.dragging = false;
    }

    handleRightClick(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clickedNode = this.getNodeAt(x, y);
        if (clickedNode) {
            this.graph.removeNode(clickedNode);
            this.draw();
        }
    }

    handleGridClick(x, y, e) {
        const gridX = Math.floor(x / this.graph.gridSize);
        const gridY = Math.floor(y / this.graph.gridSize);
        const nodeId = `${gridX},${gridY}`;

        if (e.button === 0) { // Left click
            if (this.graph.nodes.has(nodeId)) {
                // Remove obstacle
                this.graph.removeNode(nodeId);
            } else {
                // Add obstacle or path
                this.graph.addNode(nodeId, gridX * this.graph.gridSize + this.graph.gridSize / 2,
                    gridY * this.graph.gridSize + this.graph.gridSize / 2);
                // Connect to adjacent nodes
                this.connectGridNode(gridX, gridY);
            }
            this.draw();
        }
    }

    connectGridNode(gridX, gridY) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const currentId = `${gridX},${gridY}`;

        for (let [dx, dy] of directions) {
            const neighborX = gridX + dx;
            const neighborY = gridY + dy;
            const neighborId = `${neighborX},${neighborY}`;

            if (this.graph.nodes.has(neighborId)) {
                this.graph.addEdge(currentId, neighborId, 1);
            }
        }
    }

    getNodeAt(x, y) {
        for (let [id, node] of this.graph.nodes) {
            const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
            if (distance <= this.nodeRadius) {
                return id;
            }
        }
        return null;
    }

    generateNodeId() {
        let id = 0;
        while (this.graph.nodes.has(id.toString())) {
            id++;
        }
        return id.toString();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.graph.gridMode) {
            this.drawGrid();
        }

        this.drawEdges();
        this.drawNodes();
    }

    drawGrid() {
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.canvas.width; x += this.graph.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.canvas.height; y += this.graph.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawEdges() {
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = this.colors.edge;

        for (let [fromId, connections] of this.graph.edges) {
            const fromNode = this.graph.nodes.get(fromId);
            if (!fromNode) continue;

            for (let edge of connections) {
                const toNode = this.graph.nodes.get(edge.to);
                if (!toNode) continue;

                // Skip drawing duplicate edges for undirected graphs
                if (!this.graph.directed && fromId > edge.to) continue;

                this.ctx.beginPath();
                this.ctx.moveTo(fromNode.x, fromNode.y);
                this.ctx.lineTo(toNode.x, toNode.y);
                this.ctx.stroke();

                // Draw arrow for directed graphs
                if (this.graph.directed) {
                    this.drawArrow(fromNode.x, fromNode.y, toNode.x, toNode.y);
                }

                // Draw weight
                if (this.graph.weighted) {
                    const midX = (fromNode.x + toNode.x) / 2;
                    const midY = (fromNode.y + toNode.y) / 2;
                    this.ctx.fillStyle = '#fff';
                    this.ctx.fillRect(midX - 10, midY - 8, 20, 16);
                    this.ctx.fillStyle = this.colors.text;
                    this.ctx.font = '12px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(edge.weight.toString(), midX, midY + 4);
                }
            }
        }
    }

    drawArrow(fromX, fromY, toX, toY) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6;

        // Calculate arrow position (on edge of target node)
        const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
        const arrowX = toX - (this.nodeRadius * (toX - fromX)) / distance;
        const arrowY = toY - (this.nodeRadius * (toY - fromY)) / distance;

        this.ctx.beginPath();
        this.ctx.moveTo(arrowX, arrowY);
        this.ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle - arrowAngle),
            arrowY - arrowLength * Math.sin(angle - arrowAngle)
        );
        this.ctx.moveTo(arrowX, arrowY);
        this.ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle + arrowAngle),
            arrowY - arrowLength * Math.sin(angle + arrowAngle)
        );
        this.ctx.stroke();
    }

    // Add this method to GraphVisualizer class:
    validateAlgorithmInput(algorithm, startNode, endNode) {
        if (this.graph.nodes.size === 0) {
            return { valid: false, message: 'Graph is empty' };
        }

        if (algorithm === 'dijkstra' && this.graph.weighted) {
            // Check for negative weights
            for (let [_, connections] of this.graph.edges) {
                for (let edge of connections) {
                    if (edge.weight < 0) {
                        return { valid: false, message: 'Dijkstra cannot handle negative weights. Use Bellman-Ford instead.' };
                    }
                }
            }
        }

        return { valid: true };
    }

    drawNodes() {
        for (let [id, node] of this.graph.nodes) {
            let color = this.colors.node;

            if (node.visited) color = this.colors.visited;
            if (node.inQueue) color = this.colors.current;
            // Update the drawNodes method - Add this code to handle negative cycle highlighting
            // Add this to your existing drawNodes method, after the existing color logic:

            if (node.hasNegativeCycle) {
                color = '#e53e3e'; // Red for negative cycle
            }


            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, this.nodeRadius, 0, 2 * Math.PI);
            this.ctx.fill();

            this.ctx.strokeStyle = '#2d3748';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw node label
            this.ctx.fillStyle = this.colors.text;
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(id, node.x, node.y + 5);

            // Draw distance for Dijkstra
            if (node.distance !== Infinity) {
                this.ctx.font = '10px Arial';
                this.ctx.fillText(`d:${node.distance}`, node.x, node.y - 20);
            }
        }
    }

    // Algorithm implementations
    async bfs(startId) {
        const steps = [];
        const queue = [startId];
        const visited = new Set();

        steps.push({ type: 'start', node: startId, message: 'Starting BFS from node ' + startId });

        while (queue.length > 0) {
            const currentId = queue.shift();

            if (visited.has(currentId)) continue;

            visited.add(currentId);
            steps.push({
                type: 'visit',
                node: currentId,
                queue: [...queue],
                message: `Visiting node ${currentId}. Queue: [${queue.join(', ')}]`
            });

            const neighbors = this.graph.getNeighbors(currentId);
            for (let edge of neighbors) {
                if (!visited.has(edge.to)) {
                    queue.push(edge.to);
                    steps.push({
                        type: 'discover',
                        node: edge.to,
                        queue: [...queue],
                        message: `Discovered node ${edge.to}. Added to queue.`
                    });
                }
            }
        }

        return steps;
    }

    async dfs(startId) {
        const steps = [];
        const visited = new Set();

        const dfsRecursive = (nodeId) => {
            visited.add(nodeId);
            steps.push({
                type: 'visit',
                node: nodeId,
                message: `Visiting node ${nodeId} (DFS)`
            });

            const neighbors = this.graph.getNeighbors(nodeId);
            for (let edge of neighbors) {
                if (!visited.has(edge.to)) {
                    steps.push({
                        type: 'discover',
                        node: edge.to,
                        message: `Exploring neighbor ${edge.to}`
                    });
                    dfsRecursive(edge.to);
                }
            }
        };

        steps.push({ type: 'start', node: startId, message: 'Starting DFS from node ' + startId });
        dfsRecursive(startId);
        return steps;
    }

    async dijkstra(startId, endId = null) {
        const steps = [];
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();

        // Initialize
        for (let nodeId of this.graph.nodes.keys()) {
            distances.set(nodeId, Infinity);
            previous.set(nodeId, null);
            unvisited.add(nodeId);
        }
        distances.set(startId, 0);

        steps.push({ type: 'start', node: startId, message: 'Starting Dijkstra from node ' + startId });

        while (unvisited.size > 0) {
            // Find node with minimum distance
            let currentId = null;
            let minDistance = Infinity;
            for (let nodeId of unvisited) {
                if (distances.get(nodeId) < minDistance) {
                    minDistance = distances.get(nodeId);
                    currentId = nodeId;
                }
            }

            if (currentId === null || distances.get(currentId) === Infinity) break;

            unvisited.delete(currentId);
            steps.push({
                type: 'visit',
                node: currentId,
                distance: distances.get(currentId),
                message: `Visiting node ${currentId} with distance ${distances.get(currentId)}`
            });

            if (currentId === endId) {
                steps.push({ type: 'found', node: currentId, message: 'Reached target node!' });
                break;
            }

            // Update neighbors
            const neighbors = this.graph.getNeighbors(currentId);
            for (let edge of neighbors) {
                if (unvisited.has(edge.to)) {
                    const newDistance = distances.get(currentId) + edge.weight;
                    if (newDistance < distances.get(edge.to)) {
                        distances.set(edge.to, newDistance);
                        previous.set(edge.to, currentId);
                        steps.push({
                            type: 'update',
                            node: edge.to,
                            distance: newDistance,
                            message: `Updated distance to ${edge.to}: ${newDistance}`
                        });
                    }
                }
            }
        }

        // Reconstruct path if end node specified
        if (endId && distances.get(endId) !== Infinity) {
            const path = [];
            let current = endId;
            while (current !== null) {
                path.unshift(current);
                current = previous.get(current);
            }
            steps.push({ type: 'path', path: path, message: `Shortest path: ${path.join(' → ')}` });
        }

        return steps;
    }
    // Add these methods to your GraphVisualizer class

    // Bellman-Ford Algorithm - Add this method inside the GraphVisualizer class
    async bellmanFord(startId, endId = null) {
        const steps = [];
        const distances = new Map();
        const previous = new Map();
        const nodes = Array.from(this.graph.nodes.keys());
        const edges = [];
        const processedEdges = new Set();

        // Collect all edges
        // Replace the edge collection logic in bellmanFord:
        for (let [fromId, connections] of this.graph.edges) {
            for (let edge of connections) {
                // For undirected graphs, only add each edge once
                if (!this.graph.directed) {
                    const edgeKey = [fromId, edge.to].sort().join('-');
                    if (!processedEdges.has(edgeKey)) {
                        processedEdges.add(edgeKey);
                        edges.push({ from: fromId, to: edge.to, weight: edge.weight });
                    }
                } else {
                    edges.push({ from: fromId, to: edge.to, weight: edge.weight });
                }
            }
        }

        // Initialize distances
        for (let nodeId of nodes) {
            distances.set(nodeId, Infinity);
            previous.set(nodeId, null);
        }
        distances.set(startId, 0);

        steps.push({
            type: 'start',
            node: startId,
            message: `Starting Bellman-Ford from node ${startId}. Relaxing edges ${nodes.length - 1} times.`
        });

        // Relax edges |V| - 1 times
        for (let i = 0; i < nodes.length - 1; i++) {
            steps.push({
                type: 'iteration',
                iteration: i + 1,
                message: `Iteration ${i + 1}: Relaxing all edges`
            });

            let updated = false;
            for (let edge of edges) {
                const currentDist = distances.get(edge.from);
                const newDist = currentDist + edge.weight;

                if (currentDist !== Infinity && newDist < distances.get(edge.to)) {
                    distances.set(edge.to, newDist);
                    previous.set(edge.to, edge.from);
                    updated = true;

                    steps.push({
                        type: 'update',
                        node: edge.to,
                        distance: newDist,
                        from: edge.from,
                        message: `Relaxed edge ${edge.from} → ${edge.to}: distance updated to ${newDist}`
                    });
                }
            }

            if (!updated) {
                steps.push({
                    type: 'early_termination',
                    message: 'No updates in this iteration. Algorithm can terminate early.'
                });
                break;
            }
        }

        // Check for negative cycles
        steps.push({
            type: 'negative_cycle_check',
            message: 'Checking for negative cycles...'
        });

        let hasNegativeCycle = false;
        for (let edge of edges) {
            const currentDist = distances.get(edge.from);
            const newDist = currentDist + edge.weight;

            if (currentDist !== Infinity && newDist < distances.get(edge.to)) {
                hasNegativeCycle = true;
                steps.push({
                    type: 'negative_cycle',
                    edge: edge,
                    message: `Negative cycle detected! Edge ${edge.from} → ${edge.to} can still be relaxed.`
                });
                break;
            }
        }

        if (!hasNegativeCycle) {
            steps.push({
                type: 'no_negative_cycle',
                message: 'No negative cycles found. Algorithm completed successfully.'
            });

            // Reconstruct path if end node specified
            if (endId && distances.get(endId) !== Infinity) {
                const path = [];
                let current = endId;
                while (current !== null) {
                    path.unshift(current);
                    current = previous.get(current);
                }
                steps.push({
                    type: 'path',
                    path: path,
                    distance: distances.get(endId),
                    message: `Shortest path to ${endId}: ${path.join(' → ')} (distance: ${distances.get(endId)})`
                });
            }
        }

        return steps;
    }

    // Floyd-Warshall Algorithm - Add this method inside the GraphVisualizer class
    async floydWarshall() {
        const steps = [];
        const nodes = Array.from(this.graph.nodes.keys());
        const n = nodes.length;
        const dist = new Map();
        const next = new Map();

        // Initialize distance matrix
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const key = `${nodes[i]}-${nodes[j]}`;
                if (i === j) {
                    dist.set(key, 0);
                } else {
                    dist.set(key, Infinity);
                }
                next.set(key, null);
            }
        }

        // Set edge weights
        for (let [fromId, connections] of this.graph.edges) {
            for (let edge of connections) {
                const key = `${fromId}-${edge.to}`;
                dist.set(key, edge.weight);
                next.set(key, edge.to);
            }
        }

        steps.push({
            type: 'start',
            message: 'Starting Floyd-Warshall algorithm. Initializing distance matrix.'
        });

        // Floyd-Warshall main algorithm
        for (let k = 0; k < n; k++) {
            steps.push({
                type: 'iteration',
                k: nodes[k],
                iteration: k + 1,
                message: `Iteration ${k + 1}: Using node ${nodes[k]} as intermediate vertex`
            });

            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    const ikKey = `${nodes[i]}-${nodes[k]}`;
                    const kjKey = `${nodes[k]}-${nodes[j]}`;
                    const ijKey = `${nodes[i]}-${nodes[j]}`;

                    const ikDist = dist.get(ikKey);
                    const kjDist = dist.get(kjKey);
                    const currentDist = dist.get(ijKey);
                    const newDist = ikDist + kjDist;

                    if (ikDist !== Infinity && kjDist !== Infinity && newDist < currentDist) {
                        dist.set(ijKey, newDist);
                        next.set(ijKey, next.get(ikKey));

                        steps.push({
                            type: 'update',
                            from: nodes[i],
                            to: nodes[j],
                            via: nodes[k],
                            oldDistance: currentDist === Infinity ? '∞' : currentDist,
                            newDistance: newDist,
                            message: `Updated distance ${nodes[i]} → ${nodes[j]} via ${nodes[k]}: ${currentDist === Infinity ? '∞' : currentDist} → ${newDist}`
                        });
                    }
                }
            }
        }

        // Check for negative cycles
        let hasNegativeCycle = false;
        for (let i = 0; i < n; i++) {
            const key = `${nodes[i]}-${nodes[i]}`;
            if (dist.get(key) < 0) {
                hasNegativeCycle = true;
                steps.push({
                    type: 'negative_cycle',
                    node: nodes[i],
                    message: `Negative cycle detected involving node ${nodes[i]}`
                });
            }
        }

        if (!hasNegativeCycle) {
            steps.push({
                type: 'complete',
                message: 'Floyd-Warshall completed. All shortest paths computed.'
            });

            // Add final distance matrix
            const matrix = [];
            for (let i = 0; i < n; i++) {
                const row = [];
                for (let j = 0; j < n; j++) {
                    const key = `${nodes[i]}-${nodes[j]}`;
                    const distance = dist.get(key);
                    row.push(distance === Infinity ? '∞' : distance);
                }
                matrix.push(row);
            }

            steps.push({
                type: 'matrix',
                nodes: nodes,
                matrix: matrix,
                message: 'Final all-pairs shortest path distances'
            });
        }

        return steps;
    }


    async runAnimation(steps) {
        this.animation.running = true;
        this.animation.paused = false;
        this.animation.steps = steps;
        this.animation.step = 0;

        document.getElementById('algorithmInfo').style.display = 'block';

        for (let i = 0; i < steps.length && this.animation.running; i++) {
            if (this.animation.paused) {
                await new Promise(resolve => {
                    const checkPause = () => {
                        if (!this.animation.paused || !this.animation.running) {
                            resolve();
                        } else {
                            setTimeout(checkPause, 100);
                        }
                    };
                    checkPause();
                });
            }

            if (!this.animation.running) break;

            this.animation.step = i;
            await this.executeStep(steps[i]);
            await new Promise(resolve => setTimeout(resolve, this.animation.speed));
        }

        this.animation.running = false;
    }

    async executeStep(step) {
        const node = this.graph.nodes.get(step.node);

        switch (step.type) {
            case 'start':
                this.graph.resetState();
                if (node) {
                    node.inQueue = true;
                }
                break;

            case 'visit':
                if (node) {
                    node.visited = true;
                    node.inQueue = false;
                    if (step.distance !== undefined) {
                        node.distance = step.distance;
                    }
                }
                // Update queue visualization
                if (step.queue) {
                    for (let [id, n] of this.graph.nodes) {
                        n.inQueue = step.queue.includes(id) && !n.visited;
                    }
                }
                break;

            case 'discover':
                if (node) {
                    node.inQueue = true;
                }
                break;

            case 'update':
                if (node && step.distance !== undefined) {
                    node.distance = step.distance;
                }
                break;

            case 'path':
                // Highlight the shortest path
                for (let nodeId of step.path) {
                    const pathNode = this.graph.nodes.get(nodeId);
                    if (pathNode) {
                        pathNode.inPath = true;
                    }
                }
                break;
            // Update the executeStep method - Add these cases to the existing switch statement
            // Add these cases to your existing executeStep method's switch statement:

            case 'iteration':
                // For both algorithms - just display the iteration info
                break;

            case 'early_termination':
            case 'negative_cycle_check':
            case 'no_negative_cycle':
            case 'complete':
                // These are just informational steps
                break;

            case 'negative_cycle':
                // Highlight the problematic edge or node
                if (step.edge) {
                    const fromNode = this.graph.nodes.get(step.edge.from);
                    const toNode = this.graph.nodes.get(step.edge.to);
                    if (fromNode) fromNode.hasNegativeCycle = true;
                    if (toNode) toNode.hasNegativeCycle = true;
                }
                if (step.node) {
                    const problemNode = this.graph.nodes.get(step.node);
                    if (problemNode) problemNode.hasNegativeCycle = true;
                }
                break;

            case 'matrix':
                // Display the final matrix in the algorithm details
                let matrixHtml = '<table border="1"><tr><th></th>';
                for (let node of step.nodes) {
                    matrixHtml += `<th>${node}</th>`;
                }
                matrixHtml += '</tr>';

                for (let i = 0; i < step.nodes.length; i++) {
                    matrixHtml += `<tr><th>${step.nodes[i]}</th>`;
                    for (let j = 0; j < step.matrix[i].length; j++) {
                        matrixHtml += `<td>${step.matrix[i][j]}</td>`;
                    }
                    matrixHtml += '</tr>';
                }
                matrixHtml += '</table>';

                document.getElementById('algorithmDetails').innerHTML += matrixHtml;
                break;
        }

        // Update algorithm info
        document.getElementById('algorithmDetails').innerHTML =
            `<p><strong>Step ${this.animation.step + 1}:</strong> ${step.message}</p>`;

        this.draw();
        this.drawPathHighlight();
    }

    drawPathHighlight() {
        // Draw path highlighting for nodes in the shortest path
        for (let [id, node] of this.graph.nodes) {
            if (node.inPath) {
                this.ctx.strokeStyle = this.colors.path;
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, this.nodeRadius + 3, 0, 2 * Math.PI);
                this.ctx.stroke();
            }
        }
    }

    updateColors() {
        this.colors.node = document.getElementById('nodeColor').value;
        this.colors.visited = document.getElementById('visitedColor').value;
        this.colors.current = document.getElementById('currentColor').value;
        this.colors.path = document.getElementById('pathColor').value;
        this.draw();
    }

    updateSpeed() {
        const speed = document.getElementById('speed').value;
        document.getElementById('speedValue').textContent = speed;
        this.animation.speed = 1100 - (speed * 100); // Invert so higher value = faster
    }

    parseInput(format, data) {
        this.graph.clear();

        try {
            switch (format) {
                case 'adjacency_list':
                    this.parseAdjacencyList(data);
                    break;
                case 'adjacency_matrix':
                    this.parseAdjacencyMatrix(data);
                    break;
                case 'edge_list':
                    this.parseEdgeList(data);
                    break;
            }
            this.layoutNodes();
            this.draw();
            return { success: true, message: 'Graph loaded successfully!' };
        } catch (error) {
            return { success: false, message: 'Error parsing input: ' + error.message };
        }
    }

    parseAdjacencyList(data) {
        const lines = data.trim().split('\n');
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            const [nodeStr, neighborsStr] = line.split(':');
            const nodeId = nodeStr.trim();

            if (!this.graph.nodes.has(nodeId)) {
                this.graph.addNode(nodeId, 0, 0);
            }

            if (neighborsStr) {
                const neighbors = neighborsStr.split(',');
                for (let neighbor of neighbors) {
                    neighbor = neighbor.trim();
                    if (neighbor) {
                        let targetId, weight = 1;

                        if (this.graph.weighted && neighbor.includes('(')) {
                            const match = neighbor.match(/(.+)\((\d+(?:\.\d+)?)\)/);
                            if (match) {
                                targetId = match[1].trim();
                                weight = parseFloat(match[2]);
                            } else {
                                targetId = neighbor;
                            }
                        } else {
                            targetId = neighbor;
                        }

                        if (!this.graph.nodes.has(targetId)) {
                            this.graph.addNode(targetId, 0, 0);
                        }

                        this.graph.addEdge(nodeId, targetId, weight);
                    }
                }
            }
        }
    }

    parseAdjacencyMatrix(data) {
        const lines = data.trim().split('\n');
        const matrix = [];

        for (let line of lines) {
            const row = line.trim().split(/\s+/).map(x => parseFloat(x));
            matrix.push(row);
        }

        const size = matrix.length;
        for (let i = 0; i < size; i++) {
            this.graph.addNode(i.toString(), 0, 0);
        }

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (matrix[i][j] > 0) {
                    this.graph.addEdge(i.toString(), j.toString(), matrix[i][j]);
                }
            }
        }
    }

    parseEdgeList(data) {
        const lines = data.trim().split('\n');
        const nodes = new Set();

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            const parts = line.split(/\s+/);
            const from = parts[0];
            const to = parts[1];
            const weight = this.graph.weighted && parts[2] ? parseFloat(parts[2]) : 1;

            nodes.add(from);
            nodes.add(to);

            if (!this.graph.nodes.has(from)) {
                this.graph.addNode(from, 0, 0);
            }
            if (!this.graph.nodes.has(to)) {
                this.graph.addNode(to, 0, 0);
            }

            this.graph.addEdge(from, to, weight);
        }
    }

    layoutNodes() {
        const nodes = Array.from(this.graph.nodes.keys());
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.7;

        if (nodes.length === 1) {
            const node = this.graph.nodes.get(nodes[0]);
            node.x = centerX;
            node.y = centerY;
        } else {
            for (let i = 0; i < nodes.length; i++) {
                const angle = (2 * Math.PI * i) / nodes.length;
                const node = this.graph.nodes.get(nodes[i]);
                node.x = centerX + radius * Math.cos(angle);
                node.y = centerY + radius * Math.sin(angle);
            }
        }
    }

    updateInputExample() {
        const format = document.getElementById('inputFormat').value;
        const exampleDiv = document.getElementById('inputExample');

        let example = '';
        switch (format) {
            case 'adjacency_list':
                example = `Example:\nA: B, C\nB: A, D\nC: A, D\nD: B, C\n\nWith weights:\nA: B(2), C(3)\nB: A(2), D(1)`;
                break;
            case 'adjacency_matrix':
                example = `Example:\n0 1 1 0\n1 0 0 1\n1 0 0 1\n0 1 1 0\n\nWith weights:\n0 2 3 0\n2 0 0 1\n3 0 0 1\n0 1 1 0`;
                break;
            case 'edge_list':
                example = `Example:\nA B\nA C\nB D\nC D\n\nWith weights:\nA B 2\nA C 3\nB D 1\nC D 1`;
                break;
        }

        exampleDiv.textContent = example;
    }
}

// Global variables
let visualizer;

// Initialize the application
window.onload = function () {
    visualizer = new GraphVisualizer('graphCanvas');
    visualizer.updateInputExample();
};

// Global functions for UI interaction
function toggleDirected() {
    visualizer.graph.directed = document.getElementById('directed').checked;
    visualizer.draw();
}

function toggleWeighted() {
    visualizer.graph.weighted = document.getElementById('weighted').checked;
    visualizer.draw();
}

function toggleGridMode() {
    visualizer.graph.gridMode = document.getElementById('gridMode').checked;
    if (visualizer.graph.gridMode) {
        visualizer.graph.clear();
    }
    visualizer.draw();
}

function clearGraph() {
    visualizer.graph.clear();
    visualizer.animation.running = false;
    document.getElementById('algorithmInfo').style.display = 'none';
    visualizer.draw();
}

function updateInputExample() {
    visualizer.updateInputExample();
}

function parseGraphInput() {
    const format = document.getElementById('inputFormat').value;
    const data = document.getElementById('graphInput').value;
    const messageDiv = document.getElementById('inputMessage');

    if (!data.trim()) {
        messageDiv.innerHTML = '<div class="error">Please enter graph data</div>';
        return;
    }

    const result = visualizer.parseInput(format, data);

    if (result.success) {
        messageDiv.innerHTML = `<div class="success">${result.message}</div>`;
    } else {
        messageDiv.innerHTML = `<div class="error">${result.message}</div>`;
    }
}

async function startVisualization() {
    const validation = visualizer.validateAlgorithmInput(algorithm, startNode, endNode);
    if (!validation.valid) {
        alert(validation.message);
        return;
    }
    const algorithm = document.getElementById('algorithm').value;
    const startNode = document.getElementById('startNode').value.trim();
    const endNode = document.getElementById('endNode').value.trim();

    if (!startNode) {
        alert('Please enter a start node');
        return;
    }

    if (!visualizer.graph.nodes.has(startNode)) {
        alert('Start node does not exist in the graph');
        return;
    }

    if (algorithm === 'dijkstra' && endNode && !visualizer.graph.nodes.has(endNode)) {
        alert('End node does not exist in the graph');
        return;
    }

    visualizer.animation.running = false;
    visualizer.graph.resetState();

    let steps;
    switch (algorithm) {
        case 'bfs':
            steps = await visualizer.bfs(startNode);
            break;
        case 'dfs':
            steps = await visualizer.dfs(startNode);
            break;
        case 'dijkstra':
            steps = await visualizer.dijkstra(startNode, endNode || null);
            break;
        case 'bellmanford':
            steps = await visualizer.bellmanFord(startNode, endNode || null);
            break;
        case 'floydwarshall':
            steps = await visualizer.floydWarshall();
            break;
    }

    await visualizer.runAnimation(steps);
}

function pauseVisualization() {
    if (visualizer.animation.running) {
        visualizer.animation.paused = !visualizer.animation.paused;
        const button = document.getElementById('pauseBtn');
        button.textContent = visualizer.animation.paused ? 'Resume' : 'Pause';
        button.className = visualizer.animation.paused ? 'btn-success' : 'btn-warning';
    }
}

function stepVisualization() {
    if (!visualizer.animation.running && visualizer.animation.steps.length > 0) {
        if (visualizer.animation.step < visualizer.animation.steps.length) {
            visualizer.executeStep(visualizer.animation.steps[visualizer.animation.step]);
            visualizer.animation.step++;
        }
    }
}

function resetVisualization() {
    visualizer.animation.running = false;
    visualizer.animation.paused = false;
    visualizer.animation.step = 0;
    visualizer.graph.resetState();

    // Reset all node states
    for (let node of visualizer.graph.nodes.values()) {
        node.inPath = false;
    }

    document.getElementById('algorithmInfo').style.display = 'none';

    // Reset pause button
    // In resetVisualization function:
    const pauseButton = document.getElementById('pauseBtn'); // Use ID instead
    if (pauseButton) {
        pauseButton.textContent = 'Pause';
        pauseButton.className = 'btn-warning';
    }

    visualizer.draw();
}

function updateColors() {
    visualizer.updateColors();
}

// Algorithm selection change handler
document.addEventListener('DOMContentLoaded', function () {
    const algorithmSelect = document.getElementById('algorithm');
    const endNodeGroup = document.getElementById('endNodeGroup');

    algorithmSelect.addEventListener('change', function () {
        if (this.value === 'dijkstra' || this.value === 'bellmanford') {
            endNodeGroup.style.display = 'block';
        } else {
            endNodeGroup.style.display = 'none';
        }
    });

    // Initial state
    if (algorithmSelect.value !== 'dijkstra') {
        endNodeGroup.style.display = 'none';
    }
>>>>>>> 0754bdaca92692cb149e79bfb33d5405270b0c5d
});