path = "frontend/src/pages/Dashboard.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add import
old_import = "import axiosClient from '../api/axiosClient'"
new_import = old_import + "\nimport DelayCausesCard from '../components/DelayCausesCard'"
if old_import in content and "DelayCausesCard" not in content:
    content = content.replace(old_import, new_import, 1)
    print("Import added.")
else:
    print("Import already present or pattern not found, skipping.")

# 2. Insert the card right after the "Flights Over Time" card, inside the same grid
old_block = """          <div className="lg:col-span-2">
            <MiniChartCard title="Flights Over Time (last 7 days)">
              {flightsByDate.length === 0 ? (
                <p style={{ color: chartEmptyColor }} className="text-[13px]">No timeline data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={flightsByDate}>
                    <defs>
                      <linearGradient id="dashFlightsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: chartTickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartTickColor, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltip} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#dashFlightsAreaGrad)" dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </MiniChartCard>
          </div>
        </div>
      </div>"""

new_block = """          <div className="lg:col-span-2">
            <MiniChartCard title="Flights Over Time (last 7 days)">
              {flightsByDate.length === 0 ? (
                <p style={{ color: chartEmptyColor }} className="text-[13px]">No timeline data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={flightsByDate}>
                    <defs>
                      <linearGradient id="dashFlightsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: chartTickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartTickColor, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltip} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#dashFlightsAreaGrad)" dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </MiniChartCard>
          </div>

          <div className="lg:col-span-2">
            <DelayCausesCard />
          </div>
        </div>
      </div>"""

if old_block in content and "<DelayCausesCard" not in content:
    content = content.replace(old_block, new_block, 1)
    print("DelayCausesCard inserted into analytics grid.")
else:
    print("Pattern not found or already applied, skipping.")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. Dashboard.jsx updated.")
