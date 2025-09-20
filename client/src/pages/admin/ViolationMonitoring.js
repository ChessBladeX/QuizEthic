import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  AlertTriangle, 
  Eye, 
  Filter, 
  Download, 
  Clock, 
  User, 
  FileText,
  Shield,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const ViolationMonitoring = () => {
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch violations data
  const { data: violationsData, isLoading, error } = useQuery(
    ['admin-violations', priorityFilter, timeRange],
    () => api.get(`/admin/violations?priority=${priorityFilter}&timeRange=${timeRange}`),
    { refetchInterval: 10000 } // Refresh every 10 seconds
  );

  // Fetch real-time monitoring data
  const { data: monitoringData } = useQuery(
    ['admin-monitoring'],
    () => api.get('/admin/monitoring'),
    { refetchInterval: 5000 } // Refresh every 5 seconds
  );

  const violations = violationsData?.data || {};
  const monitoring = monitoringData?.data || {};

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-100 border-green-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getViolationTypeIcon = (type) => {
    switch (type) {
      case 'tab-switch':
        return <Activity className="h-4 w-4" />;
      case 'copy-paste':
        return <FileText className="h-4 w-4" />;
      case 'dev-tools':
        return <Shield className="h-4 w-4" />;
      case 'webcam-blocked':
        return <Eye className="h-4 w-4" />;
      case 'suspicious-behavior':
        return <AlertTriangle className="h-4 w-4" />;
      case 'plagiarism':
        return <FileText className="h-4 w-4" />;
      case 'multiple-devices':
        return <User className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleViolationClick = (violation) => {
    setSelectedViolation(violation);
    setIsDetailModalOpen(true);
  };

  const handleExport = () => {
    // In a real implementation, this would trigger a download
    toast.success('Export started. You will receive an email when ready.');
  };

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription>
          Failed to load violations. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Violation Monitoring</h1>
          <p className="text-gray-600">Monitor and manage security violations in real-time</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
        </div>
      </div>

      {/* Priority Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">{violations.highPriority || 0}</p>
                <p className="text-xs text-gray-500">Requires immediate attention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Medium Priority</p>
                <p className="text-2xl font-bold text-yellow-600">{violations.mediumPriority || 0}</p>
                <p className="text-xs text-gray-500">Review within 24 hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Priority</p>
                <p className="text-2xl font-bold text-green-600">{violations.lowPriority || 0}</p>
                <p className="text-xs text-gray-500">Review within 7 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Alerts */}
      {monitoring.recentViolations && monitoring.recentViolations.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <Activity className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong>{monitoring.recentViolations.length} new violations</strong> detected in the last hour.
            <Button variant="link" className="p-0 h-auto ml-2">
              View details
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search violations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="violations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="violations">All Violations</TabsTrigger>
          <TabsTrigger value="realtime">Real-time Monitoring</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Violations Tab */}
        <TabsContent value="violations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Violation History ({violations.total || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Exam</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violations.recent?.map((violation, index) => (
                      <TableRow key={index} className="cursor-pointer hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getViolationTypeIcon(violation.type)}
                            <span className="font-medium capitalize">
                              {violation.type.replace('-', ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {violation.studentName.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <span className="font-medium">{violation.studentName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">{violation.examTitle}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(violation.priority)}>
                            {getPriorityIcon(violation.priority)}
                            <span className="ml-1 capitalize">{violation.priority}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {formatTimestamp(violation.timestamp)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViolationClick(violation)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No violations found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Real-time Monitoring Tab */}
        <TabsContent value="realtime" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Active Sessions ({monitoring.totalActiveSessions || 0})
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

            {/* Live Violations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Live Violations
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
                        <p className="text-xs text-gray-500">{formatTimestamp(violation.timestamp)}</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-sm">No recent violations</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Violations</p>
                    <p className="text-2xl font-bold">{violations.total || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-red-100">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Flagged Attempts</p>
                    <p className="text-2xl font-bold">{monitoring.monitoringData?.flaggedAttempts || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-yellow-100">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                    <p className="text-2xl font-bold">2.3s</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Resolved</p>
                    <p className="text-2xl font-bold">85%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Violation Trends Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Violation Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">Chart visualization would go here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Violation Detail Modal */}
      {selectedViolation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Violation Details</h3>
              <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Type</label>
                <p className="text-lg font-medium capitalize">
                  {selectedViolation.type?.replace('-', ' ')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Student</label>
                <p className="text-lg">{selectedViolation.studentName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Exam</label>
                <p className="text-lg">{selectedViolation.examTitle}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-lg">{selectedViolation.description || 'No description available'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Priority</label>
                <Badge className={getPriorityColor(selectedViolation.priority)}>
                  {getPriorityIcon(selectedViolation.priority)}
                  <span className="ml-1 capitalize">{selectedViolation.priority}</span>
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Timestamp</label>
                <p className="text-lg">{formatTimestamp(selectedViolation.timestamp)}</p>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
              <Button>
                Take Action
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViolationMonitoring;
