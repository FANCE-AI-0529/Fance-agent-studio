
-- Allow admins to view waiting list
CREATE POLICY "Admins can view waiting list"
  ON public.waiting_list FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update waiting list entries
CREATE POLICY "Admins can update waiting list"
  ON public.waiting_list FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete waiting list entries
CREATE POLICY "Admins can delete waiting list"
  ON public.waiting_list FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
