// This file is a graph service. It builds network graph data for visualization:
// buildGraph reads recent signals from the database
// It turns users, hosts, IPs, and domains into nodes
// It connects them with edges labeled by signal type
// It sits behind the Network Graph page on the frontend.

import { pool } from '../config/db.js';
// The pool manages database connections for you.

// Build { nodes, edges } for the Network Graph page over a time window. // this line explains what buildGraph returns
// Now we get to the first major function. It Creates a Export named buildGraph
export async function buildGraph(organizationId, hours = 24) {
  // Query recent signals with relevant fields for graph building // this line explains the next query
  const sig = await pool.query( // this line fetches up to 500 recent signals for this org in the time window
    `SELECT user_identity, hostname, source_ip, domain, signal_type, risk_score, severity
     FROM signals WHERE organization_id = $1 AND event_timestamp > NOW() - ($2 || ' hours')::INTERVAL LIMIT 500`, // this line is the SQL that filters by org and time
    [organizationId, String(hours)] // this line fills $1 with the org id and $2 with the hours window
  );
  const nodes = new Map(); // Map to deduplicate nodes by ID // this line makes a Map so each node appears only once
  const edges = []; // Array to store edges // this line makes an empty list to hold the connections
  
  // Helper function to add a node if not already present // this line explains the helper below
  const add = (id, type, label, risk = 10) => { // this line defines a small helper that adds one node
    if (!id || nodes.has(id)) return; // Skip if no ID or already exists // this line skips empty ids or nodes we already added
    nodes.set(id, { id, type, label, risk }); // Store node with type, label, and risk // this line saves the node with its id, type, label, and risk
  };
  
  // Process each signal to build nodes and edges // this line explains the next loop
  for (const r of sig.rows) { // this line loops over every signal row from the database
    // Add nodes for each entity type // this line explains the node lines below
    if (r.user_identity) add(`user:${r.user_identity}`, 'user', r.user_identity, r.risk_score); // this line adds a user node if the signal has a user
    if (r.hostname) add(`host:${r.hostname}`, 'device', r.hostname, r.risk_score); // this line adds a device node if the signal has a hostname
    if (r.source_ip) add(`ip:${r.source_ip}`, 'ip', r.source_ip, r.risk_score); // this line adds an IP node if the signal has a source IP
    if (r.domain) add(`dom:${r.domain}`, 'domain', r.domain, r.risk_score); // this line adds a domain node if the signal has a domain
    // Add edges between related entities // this line explains the edge lines below
    if (r.user_identity && r.hostname) edges.push({ from: `user:${r.user_identity}`, to: `host:${r.hostname}`, label: r.signal_type }); // this line connects user to host with the signal type as label
    if (r.user_identity && r.source_ip) edges.push({ from: `user:${r.user_identity}`, to: `ip:${r.source_ip}`, label: r.signal_type }); // this line connects user to IP with the signal type as label
    if (r.user_identity && r.domain) edges.push({ from: `user:${r.user_identity}`, to: `dom:${r.domain}`, label: r.signal_type }); // this line connects user to domain with the signal type as label
    if (r.hostname && r.source_ip) edges.push({ from: `host:${r.hostname}`, to: `ip:${r.source_ip}`, label: r.signal_type }); // this line connects host to IP with the signal type as label
    if (r.hostname && r.domain) edges.push({ from: `host:${r.hostname}`, to: `dom:${r.domain}`, label: r.signal_type }); // this line connects host to domain with the signal type as label
    if (r.source_ip && r.domain) edges.push({ from: `ip:${r.source_ip}`, to: `dom:${r.domain}`, label: 'resolves' }); // this line connects IP to domain with a resolves label
  }
  // Return nodes and edges (limit edges to 800 for performance) // this line explains the return below
  return { nodes: [...nodes.values()], edges: edges.slice(0, 800) }; // this line returns the node list and the first 800 edges so the UI stays fast
}
export default buildGraph;
// The default export is buildGraph so other files can import it easily.
