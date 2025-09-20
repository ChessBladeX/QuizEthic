import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  BarChart3, 
  Users, 
  FileText, 
  AlertTriangle, 
  Eye, 
  Download, 
  Settings,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Shield,
  Monitor,
  Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery(
    ['admin-dashboard', timeRange],
    () => api.get(`/admin/dashboard?timeRange=${timeRange}`),
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  // Fetch real-time monitoring data
  const { data: monitoringData, isLoading: monitoringLoading } = useQuery(
    ['admin-monitoring'],
    () => api.get('/admin/monitoring'),
    { refetchInterval: 5000 } // Refresh every 5 seconds
  );

  // Fetch violation alerts
  const { data: violationAlerts, isLoading: alertsLoading } = useQuery(
    ['admin-violations'],
    () => api.get('/admin/violations'),
    { refetchInterval: 10000 } // Refresh every 10 seconds
  );

  const stats = dashboardData?.data || {};
  const monitoring = monitoringData?.data || {};
  const violations = violationAlerts?.data || [];

  const StatCard = ({ title, value, icon: Icon, trend, color = 'blue' }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  );

  const MetricCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg bg-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor system performance and user activity</p>
        </div>
        <div className="flex space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Alert Banner */}
      {violations.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <strong>{violations.length} high-priority violations</strong> detected in the last hour. 
            <Button variant="link" className="p-0 h-auto ml-2">
              Review now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers || 0}
          icon={Users}
          trend={stats.userGrowth || 0}
          color="blue"
        />
        <StatCard
          title="Active Exams"
          value={stats.activeExams || 0}
          icon={FileText}
          trend={stats.examGrowth || 0}
          color="green"
        />
        <StatCard
          title="Total Attempts"
          value={stats.totalAttempts || 0}
          icon={Activity}
          trend={stats.attemptGrowth || 0}
          color="purple"
        />
        <StatCard
          title="Violations Detected"
          value={stats.totalViolations || 0}
          icon={Shield}
          trend={stats.violationGrowth || 0}
          color="red"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monitoring">Live Monitoring</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Monitor className="h-5 w-5 mr-2" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Server Status</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Healthy
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Database</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Anti-Cheating</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU Usage</span>
                    <span>{stats.cpuUsage || 0}%</span>
                  </div>
                  <Progress value={stats.cpuUsage || 0} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span>{stats.memoryUsage || 0}%</span>
                  </div>
                  <Progress value={stats.memoryUsage || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentActivity?.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'violation' ? 'bg-red-500' :
                        activity.type === 'exam' ? 'bg-blue-500' :
                        'bg-green-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.description}</p>
                        <p className="text-xs text-gray-500">{activity.timestamp}</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Response Time"
              value={`${stats.avgResponseTime || 0}ms`}
              subtitle="Average API response time"
              icon={Clock}
              color="blue"
            />
            <MetricCard
              title="Success Rate"
              value={`${stats.successRate || 0}%`}
              subtitle="API request success rate"
              icon={TrendingUp}
              color="green"
            />
            <MetricCard
              title="Data Storage"
              value={`${stats.storageUsed || 0}GB`}
              subtitle={`${stats.storageTotal || 0}GB total`}
              icon={Database}
              color="purple"
            />
          </div>
        </TabsContent>

        {/* Live Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Active Exam Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monitoring.activeSessions?.map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{session.studentName}</p>
                        <p className="text-sm text-gray-500">{session.examTitle}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={session.riskLevel === 'high' ? 'destructive' : 'secondary'}>
                          {session.riskLevel} risk
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.floor((Date.now() - new Date(session.startTime)) / 60000)}m ago
                        </p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-sm">No active sessions</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Real-time Violations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Real-time Violations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monitoring.recentViolations?.map((violation, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 border-l-4 border-red-500 bg-red-50 rounded">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{violation.type}</p>
                        <p className="text-xs text-gray-600">{violation.studentName} - {violation.examTitle}</p>
                        <p className="text-xs text-gray-500">{violation.timestamp}</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-sm">No recent violations</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monitoring Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Alerts
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Logs
                </Button>
                <Button variant="outline" size="sm">
                  <Monitor className="h-4 w-4 mr-2" />
                  System Diagnostics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Violations Tab */}
        <TabsContent value="violations" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Violation Management</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="High Priority"
              value={violations.highPriority || 0}
              subtitle="Requires immediate attention"
              icon={AlertTriangle}
              color="red"
            />
            <MetricCard
              title="Medium Priority"
              value={violations.mediumPriority || 0}
              subtitle="Review within 24 hours"
              icon={Clock}
              color="yellow"
            />
            <MetricCard
              title="Low Priority"
              value={violations.lowPriority || 0}
              subtitle="Review within 7 days"
              icon={CheckCircle}
              color="green"
            />
          </div>

          {/* Violation List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Violations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {violations.recent?.map((violation, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        violation.priority === 'high' ? 'bg-red-500' :
                        violation.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`} />
                      <div>
                        <p className="font-medium">{violation.type}</p>
                        <p className="text-sm text-gray-600">
                          {violation.studentName} - {violation.examTitle}
                        </p>
                        <p className="text-xs text-gray-500">{violation.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        violation.priority === 'high' ? 'destructive' :
                        violation.priority === 'medium' ? 'default' :
                        'secondary'
                      }>
                        {violation.priority}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">{violation.timestamp}</p>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-8">No violations found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">User Management</h3>
            <Link to="/admin/users">
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold">{stats.totalUsers || 0}</p>
                    <p className="text-xs text-gray-500">{stats.activeUsers || 0} active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Instructors</p>
                    <p className="text-2xl font-bold">{stats.instructors || 0}</p>
                    <p className="text-xs text-gray-500">Teaching staff</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Students</p>
                    <p className="text-2xl font-bold">{stats.students || 0}</p>
                    <p className="text-xs text-gray-500">Active learners</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent User Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentUsers?.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{user.role}</Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-8">No recent user activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Exam Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Average Score</span>
                    <span className="font-medium">{stats.avgExamScore || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completion Rate</span>
                    <span className="font-medium">{stats.completionRate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Duration</span>
                    <span className="font-medium">{Math.round((stats.avgDuration || 0) / 60000)}m</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Daily Active Users</span>
                    <span className="font-medium">{stats.dailyActiveUsers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Session Duration</span>
                    <span className="font-medium">{Math.round((stats.avgSessionDuration || 0) / 60000)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Return Rate</span>
                    <span className="font-medium">{stats.returnRate || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">Chart visualization would go here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Anti-Cheating Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Webcam Monitoring</span>
                      <Badge variant="outline">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Behavior Analysis</span>
                      <Badge variant="outline">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Plagiarism Detection</span>
                      <Badge variant="outline">Enabled</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Performance Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Auto-scaling</span>
                      <Badge variant="outline">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Cache Duration</span>
                      <span className="text-sm text-gray-600">5 minutes</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Backup Frequency</span>
                      <span className="text-sm text-gray-600">Daily</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;