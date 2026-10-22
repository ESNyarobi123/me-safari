export const roles=['CUSTOMER','OPERATIONS','DRIVER_GUIDE','ADMIN'] as const;
export type Role=typeof roles[number];
export const permissions=[
 'catalog.read','catalog.manage','content.publish','customer.read','customer.manage','inquiry.manage',
 'booking.create_own','booking.create_for_customer','booking.read','booking.confirm','booking.change_review','booking.cancel_review','booking.confirm_override',
 'itinerary.manage','quote.manage','quote.accept_own','assignment.manage','trip.read','trip.update_assigned','issue.report_assigned','issue.manage',
 'fleet.manage','rental.manage','staff.manage','payment.read_own','finance.read','finance.offline_record','finance.offline_verify','finance.adjustment','refund.request','refund.approve',
 'report.operations','report.finance','access.manage','settings.manage','audit.read','support.manage'
] as const;
export type Permission=typeof permissions[number];
export const rolePermissions:Record<Role,readonly Permission[]>={
 CUSTOMER:['catalog.read','booking.create_own','booking.read','quote.accept_own','trip.read','payment.read_own','refund.request'],
 OPERATIONS:['catalog.read','rental.manage','customer.read','customer.manage','inquiry.manage','booking.create_for_customer','booking.read','booking.confirm','booking.change_review','booking.cancel_review','itinerary.manage','quote.manage','assignment.manage','trip.read','issue.manage','report.operations','support.manage'],
 DRIVER_GUIDE:['catalog.read','trip.read','trip.update_assigned','issue.report_assigned'],ADMIN:permissions
};
